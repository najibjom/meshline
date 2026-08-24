mod protocol;
mod storage;

use std::{collections::HashSet, error::Error, time::Duration};

use clap::Parser;
use futures::StreamExt;
use libp2p::{
    gossipsub, mdns, noise,
    swarm::{NetworkBehaviour, SwarmEvent},
    tcp, yamux, Multiaddr,
};
use protocol::{decrypt_text, encrypt_text, receipt_for, Envelope, Receipt, WireMessage};
use tokio::{select, time::interval};
use tracing_subscriber::EnvFilter;

const DEFAULT_TOPIC: &str = "meshline-p2p-demo-v1";
const DEMONSTRATION_TTL_MS: u64 = 120_000;
const PUBSUB_STABILIZATION_DELAY: Duration = Duration::from_secs(3);

#[derive(Parser, Debug)]
#[command(
    name = "meshline-p2p-demo",
    about = "Bounded libp2p text-envelope proof. It is not a production messenger."
)]
struct Args {
    /// A shared test secret used only to show opaque authenticated text envelopes.
    #[arg(long, env = "MESHLINE_DEMO_SECRET")]
    demo_secret: String,

    /// Topic namespace for this isolated demonstration.
    #[arg(long, default_value = DEFAULT_TOPIC)]
    topic: String,

    /// TCP port to listen on. Use 0 to let the operating system choose one.
    #[arg(long, default_value_t = 0)]
    tcp_port: u16,

    /// QUIC UDP port to listen on. Use 0 to let the operating system choose one.
    #[arg(long, default_value_t = 0)]
    quic_port: u16,

    /// A known peer multiaddr, including its /p2p/<peer-id> suffix. This can be repeated.
    #[arg(long)]
    peer: Vec<Multiaddr>,

    /// An optional text message to transmit after a peer connection is established.
    #[arg(long)]
    send: Option<String>,

    /// Recipient libp2p peer ID for --send. Other peers relay the opaque envelope but do not decrypt it.
    #[arg(long)]
    recipient: Option<String>,

    /// Stop after this many seconds. A value of zero runs until stopped manually.
    #[arg(long, default_value_t = 45)]
    run_seconds: u64,
}

#[derive(NetworkBehaviour)]
struct MeshlineBehaviour {
    gossipsub: gossipsub::Behaviour,
    mdns: mdns::tokio::Behaviour,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .try_init();
    let args = Args::parse();
    if args.send.is_some() && args.recipient.is_none() {
        return Err("--recipient is required whenever --send is supplied".into());
    }

    let mut swarm = libp2p::SwarmBuilder::with_new_identity()
        .with_tokio()
        .with_tcp(
            tcp::Config::default(),
            noise::Config::new,
            yamux::Config::default,
        )?
        .with_quic()
        .with_behaviour(|key| {
            let message_id_fn = |message: &gossipsub::Message| {
                gossipsub::MessageId::from(
                    message
                        .data
                        .iter()
                        .fold(0_u64, |hash, byte| {
                            hash.wrapping_mul(31).wrapping_add(u64::from(*byte))
                        })
                        .to_string(),
                )
            };
            let config = gossipsub::ConfigBuilder::default()
                .validation_mode(gossipsub::ValidationMode::Strict)
                .flood_publish(true)
                .message_id_fn(message_id_fn)
                .build()
                .map_err(std::io::Error::other)?;
            let gossipsub = gossipsub::Behaviour::new(
                gossipsub::MessageAuthenticity::Signed(key.clone()),
                config,
            )?;
            let mdns =
                mdns::tokio::Behaviour::new(mdns::Config::default(), key.public().to_peer_id())?;
            Ok(MeshlineBehaviour { gossipsub, mdns })
        })?
        .build();

    let local_peer = swarm.local_peer_id().to_string();
    let topic = gossipsub::IdentTopic::new(args.topic.clone());
    swarm.behaviour_mut().gossipsub.subscribe(&topic)?;
    swarm.listen_on(format!("/ip4/0.0.0.0/tcp/{}", args.tcp_port).parse()?)?;
    swarm.listen_on(format!("/ip4/0.0.0.0/udp/{}/quic-v1", args.quic_port).parse()?)?;

    for address in &args.peer {
        println!("DIAL requested: {address}");
        swarm.dial(address.clone())?;
    }

    println!("MESHLINE_P2P_DEMO_PEER {local_peer}");
    println!(
        "SCOPE signed libp2p pubsub + test-only opaque envelopes; not a production security protocol"
    );

    let mut seen_envelopes = HashSet::new();
    let mut send_attempted = false;
    let mut first_connection_at = None;
    let mut ticker = interval(Duration::from_millis(500));
    let deadline = if args.run_seconds == 0 {
        None
    } else {
        Some(tokio::time::Instant::now() + Duration::from_secs(args.run_seconds))
    };

    loop {
        select! {
            _ = ticker.tick() => {
                if let Some(limit) = deadline {
                    if tokio::time::Instant::now() >= limit {
                        println!("DEMO_COMPLETE timeout");
                        return Ok(());
                    }
                }
                if !send_attempted
                    && first_connection_at.is_some_and(|connected_at: tokio::time::Instant| {
                        connected_at.elapsed() >= PUBSUB_STABILIZATION_DELAY
                    })
                {
                    if let Some(text) = args.send.as_deref() {
                        let envelope = encrypt_text(
                            local_peer.clone(),
                            args.recipient.clone().expect("recipient checked before startup"),
                            text,
                            &args.demo_secret,
                            DEMONSTRATION_TTL_MS,
                        )?;
                        publish(&mut swarm, &topic, WireMessage::Envelope(envelope))?;
                        send_attempted = true;
                    }
                }
            }
            event = swarm.select_next_some() => match event {
                SwarmEvent::NewListenAddr { address, .. } => {
                    println!("LISTEN {address}/p2p/{local_peer}");
                }
                SwarmEvent::ConnectionEstablished { peer_id, .. } => {
                    println!("CONNECTED {peer_id}");
                    first_connection_at.get_or_insert_with(tokio::time::Instant::now);
                    swarm.behaviour_mut().gossipsub.add_explicit_peer(&peer_id);
                }
                SwarmEvent::Behaviour(MeshlineBehaviourEvent::Mdns(mdns::Event::Discovered(
                    peers,
                ))) => {
                    for (peer_id, address) in peers {
                        println!("MDNS_DISCOVERED {peer_id} {address}");
                        swarm.behaviour_mut().gossipsub.add_explicit_peer(&peer_id);
                    }
                }
                SwarmEvent::Behaviour(MeshlineBehaviourEvent::Mdns(mdns::Event::Expired(
                    peers,
                ))) => {
                    for (peer_id, _) in peers {
                        swarm.behaviour_mut().gossipsub.remove_explicit_peer(&peer_id);
                    }
                }
                SwarmEvent::Behaviour(MeshlineBehaviourEvent::Gossipsub(event)) => match event {
                    gossipsub::Event::Message { message, .. } => {
                        process_message(
                            &mut swarm,
                            &topic,
                            &local_peer,
                            &args.demo_secret,
                            &mut seen_envelopes,
                            &message.data,
                        )?;
                    }
                    other => println!("GOSSIPSUB_EVENT {other:?}"),
                },
                _ => {}
            }
        }
    }
}

fn publish(
    swarm: &mut libp2p::Swarm<MeshlineBehaviour>,
    topic: &gossipsub::IdentTopic,
    message: WireMessage,
) -> Result<(), Box<dyn Error>> {
    let bytes = serde_json::to_vec(&message)?;
    let targets = swarm
        .behaviour()
        .gossipsub
        .all_peers()
        .map(|(peer_id, topics)| format!("{peer_id}:{}", topics.len()))
        .collect::<Vec<_>>();
    println!("PUBLISH_TARGETS {}", targets.join(","));
    let id = swarm
        .behaviour_mut()
        .gossipsub
        .publish(topic.clone(), bytes)?;
    println!("PUBLISHED {id}");
    Ok(())
}

fn process_message(
    swarm: &mut libp2p::Swarm<MeshlineBehaviour>,
    topic: &gossipsub::IdentTopic,
    local_peer: &str,
    demo_secret: &str,
    seen_envelopes: &mut HashSet<uuid::Uuid>,
    data: &[u8],
) -> Result<(), Box<dyn Error>> {
    let message: WireMessage = match serde_json::from_slice(data) {
        Ok(message) => message,
        Err(error) => {
            println!("REJECTED_WIRE_FORMAT {error}");
            return Ok(());
        }
    };

    match message {
        WireMessage::Envelope(envelope) => {
            println!("RECEIVED_WIRE_ENVELOPE {}", envelope.id);
            process_envelope(
                swarm,
                topic,
                local_peer,
                demo_secret,
                seen_envelopes,
                envelope,
            )
        }
        WireMessage::Receipt(receipt) => {
            println!("RECEIVED_WIRE_RECEIPT {}", receipt.envelope_id);
            process_receipt(local_peer, receipt)
        }
    }
}

fn process_envelope(
    swarm: &mut libp2p::Swarm<MeshlineBehaviour>,
    topic: &gossipsub::IdentTopic,
    local_peer: &str,
    demo_secret: &str,
    seen_envelopes: &mut HashSet<uuid::Uuid>,
    envelope: Envelope,
) -> Result<(), Box<dyn Error>> {
    if envelope.recipient_peer != local_peer {
        println!("FORWARDED_OPAQUE_ENVELOPE {}", envelope.id);
        return Ok(());
    }
    if !seen_envelopes.insert(envelope.id) {
        println!("DUPLICATE_ENVELOPE {}", envelope.id);
        return Ok(());
    }
    match decrypt_text(&envelope, demo_secret) {
        Ok(text) => {
            println!("RECEIVED_ENCRYPTED_TEXT {} {}", envelope.id, text);
            publish(
                swarm,
                topic,
                WireMessage::Receipt(receipt_for(&envelope, local_peer.to_owned())),
            )?;
        }
        Err(error) => println!("REJECTED_ENVELOPE {} {error}", envelope.id),
    }
    Ok(())
}

fn process_receipt(local_peer: &str, receipt: Receipt) -> Result<(), Box<dyn Error>> {
    if receipt.sender_peer == local_peer {
        println!(
            "DELIVERED {} acknowledged_by={}",
            receipt.envelope_id, receipt.recipient_peer
        );
    }
    Ok(())
}
