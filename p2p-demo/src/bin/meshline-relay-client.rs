use std::{collections::HashSet, error::Error, path::PathBuf, time::Duration};

use clap::{Parser, ValueEnum};
use futures::StreamExt;
use libp2p::{
    core::multiaddr::Protocol, dcutr, gossipsub, identify, noise, ping, relay,
    swarm::{NetworkBehaviour, SwarmEvent},
    tcp, yamux, Multiaddr, PeerId,
};
use meshline_p2p_demo::{
    identity::load_or_create_identity,
    protocol::{decrypt_text, encrypt_text, receipt_for, Envelope, WireMessage},
};
use tokio::{select, time::interval};
use tracing_subscriber::EnvFilter;

const DEFAULT_TOPIC: &str = "meshline-three-node-transport-v1";
const ENVELOPE_TTL_MS: u64 = 120_000;
const SEND_DELAY: Duration = Duration::from_secs(2);

#[derive(Debug, Clone, Copy, ValueEnum)]
enum Mode {
    Listener,
    Dialer,
}

#[derive(Debug, Parser)]
#[command(
    name = "meshline-relay-client",
    about = "Private peer for Meshline’s bounded Circuit Relay/DCUtR text-transport experiment."
)]
struct Args {
    #[arg(long, value_enum)]
    mode: Mode,

    /// Include the relay peer ID, for example /ip4/203.0.113.10/tcp/4020/p2p/RELAY.
    #[arg(long)]
    relay: Multiaddr,

    /// Required for a dialer. This is the listener's libp2p peer ID.
    #[arg(long)]
    remote_peer: Option<PeerId>,

    /// Persistent harness-only libp2p identity. This is not a Meshline account key.
    #[arg(long, env = "MESHLINE_P2P_IDENTITY_FILE")]
    identity_file: PathBuf,

    /// Shared test secret. Never use account, device, or real-message secrets.
    #[arg(long, env = "MESHLINE_DEMO_SECRET")]
    demo_secret: String,

    /// A test-only text envelope to transmit after the relayed peer connection is ready. Dialer mode only.
    #[arg(long)]
    send: Option<String>,

    #[arg(long, default_value = DEFAULT_TOPIC)]
    topic: String,

    #[arg(long, default_value_t = 90)]
    run_seconds: u64,
}

#[derive(NetworkBehaviour)]
struct ClientBehaviour {
    relay_client: relay::client::Behaviour,
    identify: identify::Behaviour,
    dcutr: dcutr::Behaviour,
    ping: ping::Behaviour,
    gossipsub: gossipsub::Behaviour,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .try_init();
    let args = Args::parse();
    if matches!(args.mode, Mode::Dialer) && args.remote_peer.is_none() {
        return Err("--remote-peer is required in dialer mode".into());
    }
    if args.send.is_some() && !matches!(args.mode, Mode::Dialer) {
        return Err("--send is only supported in dialer mode".into());
    }
    let identity = load_or_create_identity(&args.identity_file)?;

    let mut swarm = libp2p::SwarmBuilder::with_existing_identity(identity)
        .with_tokio()
        .with_tcp(
            tcp::Config::default().nodelay(true),
            noise::Config::new,
            yamux::Config::default,
        )?
        .with_quic()
        .with_relay_client(noise::Config::new, yamux::Config::default)?
        .with_behaviour(|key, relay_client| {
            let config = gossipsub::ConfigBuilder::default()
                .validation_mode(gossipsub::ValidationMode::Strict)
                .flood_publish(true)
                .build()
                .map_err(std::io::Error::other)?;
            let gossipsub = gossipsub::Behaviour::new(
                gossipsub::MessageAuthenticity::Signed(key.clone()),
                config,
            )?;
            Ok(ClientBehaviour {
                relay_client,
                identify: identify::Behaviour::new(identify::Config::new(
                    "/meshline/relay-probe/1.0.0".into(),
                    key.public(),
                )),
                dcutr: dcutr::Behaviour::new(key.public().to_peer_id()),
                ping: ping::Behaviour::new(ping::Config::new()),
                gossipsub,
            })
        })?
        .build();

    let local_peer = swarm.local_peer_id().to_string();
    let topic = gossipsub::IdentTopic::new(args.topic.clone());
    swarm.behaviour_mut().gossipsub.subscribe(&topic)?;
    swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse()?)?;
    swarm.listen_on("/ip4/0.0.0.0/udp/0/quic-v1".parse()?)?;
    swarm.dial(args.relay.clone())?;
    println!("MESHLINE_RELAY_CLIENT_PEER {local_peer}");
    println!("CLIENT_IDENTITY_FILE {}", args.identity_file.display());
    println!("SCOPE transparent relay transport plus DCUtR probe; opaque test envelope only, no production security or storage claim");

    let deadline = if args.run_seconds == 0 {
        None
    } else {
        Some(tokio::time::Instant::now() + Duration::from_secs(args.run_seconds))
    };
    let mut requested_route = false;
    let mut remote_connected_at = None;
    let mut send_attempted = false;
    let mut seen_envelopes = HashSet::new();
    let mut ticker = interval(Duration::from_millis(250));

    loop {
        select! {
            _ = ticker.tick() => {
                if deadline.is_some_and(|limit| tokio::time::Instant::now() >= limit) {
                    println!("RELAY_CLIENT_PROBE_COMPLETE timeout");
                    return Ok(());
                }
                if !send_attempted
                    && remote_connected_at.is_some_and(|connected_at: tokio::time::Instant| connected_at.elapsed() >= SEND_DELAY)
                    && args.send.is_some()
                {
                    let remote_peer = args.remote_peer.expect("dialer peer checked at startup");
                    let envelope = encrypt_text(
                        local_peer.clone(),
                        remote_peer.to_string(),
                        args.send.as_deref().expect("send checked before dispatch"),
                        &args.demo_secret,
                        ENVELOPE_TTL_MS,
                    )?;
                    publish(&mut swarm, &topic, WireMessage::Envelope(envelope))?;
                    println!("P2P_ENVELOPE_SENT");
                    send_attempted = true;
                }
            }
            event = swarm.select_next_some() => match event {
                SwarmEvent::NewListenAddr { address, .. } => println!("CLIENT_LISTEN {address}/p2p/{local_peer}"),
                SwarmEvent::ConnectionEstablished { peer_id, endpoint, .. } => {
                    let is_relayed = endpoint.get_remote_address().iter().any(|protocol| matches!(protocol, Protocol::P2pCircuit));
                    if let Some(remote_peer) = args.remote_peer {
                        if peer_id == remote_peer {
                            if is_relayed {
                                println!("TRANSPORT_RELAY_CONNECTED remote={peer_id}");
                            } else {
                                println!("TRANSPORT_DIRECT_CONNECTED remote={peer_id}");
                            }
                            remote_connected_at.get_or_insert_with(tokio::time::Instant::now);
                            swarm.behaviour_mut().gossipsub.add_explicit_peer(&peer_id);
                        }
                    }
                    if !requested_route {
                        requested_route = true;
                        match args.mode {
                            Mode::Listener => {
                                swarm.listen_on(args.relay.clone().with(Protocol::P2pCircuit))?;
                                println!("RELAY_RESERVATION_REQUESTED");
                            }
                            Mode::Dialer => {
                                let remote_peer = args.remote_peer.expect("dialer peer checked at startup");
                                swarm.dial(args.relay.clone().with(Protocol::P2pCircuit).with(Protocol::P2p(remote_peer)))?;
                                println!("RELAY_CONNECTION_REQUESTED remote={remote_peer}");
                            }
                        }
                    }
                }
                SwarmEvent::Behaviour(ClientBehaviourEvent::RelayClient(relay::client::Event::ReservationReqAccepted { .. })) => {
                    println!("RELAY_RESERVATION_ACCEPTED");
                }
                SwarmEvent::Behaviour(ClientBehaviourEvent::Dcutr(dcutr::Event { remote_peer_id, result })) => match result {
                    Ok(_) => println!("DCUTR_SUCCEEDED remote={remote_peer_id}"),
                    Err(error) => println!("DCUTR_FAILED remote={remote_peer_id} error={error}"),
                },
                SwarmEvent::Behaviour(ClientBehaviourEvent::Gossipsub(gossipsub::Event::Message { message, .. })) => {
                    process_message(&mut swarm, &topic, &local_peer, &args.demo_secret, &mut seen_envelopes, &message.data)?;
                }
                SwarmEvent::OutgoingConnectionError { peer_id, error, .. } => println!("RELAY_CONNECTION_ERROR peer={peer_id:?} error={error}"),
                _ => {}
            }
        }
    }
}

fn publish(
    swarm: &mut libp2p::Swarm<ClientBehaviour>,
    topic: &gossipsub::IdentTopic,
    message: WireMessage,
) -> Result<(), Box<dyn Error>> {
    let message_id = swarm.behaviour_mut().gossipsub.publish(topic.clone(), serde_json::to_vec(&message)?)?;
    println!("P2P_WIRE_PUBLISHED {message_id}");
    Ok(())
}

fn process_message(
    swarm: &mut libp2p::Swarm<ClientBehaviour>,
    topic: &gossipsub::IdentTopic,
    local_peer: &str,
    demo_secret: &str,
    seen_envelopes: &mut HashSet<uuid::Uuid>,
    data: &[u8],
) -> Result<(), Box<dyn Error>> {
    let message: WireMessage = match serde_json::from_slice(data) {
        Ok(message) => message,
        Err(error) => {
            println!("P2P_REJECTED_WIRE_FORMAT {error}");
            return Ok(());
        }
    };
    match message {
        WireMessage::Envelope(envelope) => process_envelope(swarm, topic, local_peer, demo_secret, seen_envelopes, envelope),
        WireMessage::Receipt(receipt) => {
            if receipt.sender_peer == local_peer {
                println!("P2P_DELIVERED envelope={} acknowledged_by={}", receipt.envelope_id, receipt.recipient_peer);
            }
            Ok(())
        }
    }
}

fn process_envelope(
    swarm: &mut libp2p::Swarm<ClientBehaviour>,
    topic: &gossipsub::IdentTopic,
    local_peer: &str,
    demo_secret: &str,
    seen_envelopes: &mut HashSet<uuid::Uuid>,
    envelope: Envelope,
) -> Result<(), Box<dyn Error>> {
    if envelope.recipient_peer != local_peer {
        println!("P2P_OPAQUE_ENVELOPE_NOT_FOR_LOCAL_PEER id={}", envelope.id);
        return Ok(());
    }
    if !seen_envelopes.insert(envelope.id) {
        println!("P2P_DUPLICATE_ENVELOPE id={}", envelope.id);
        return Ok(());
    }
    match decrypt_text(&envelope, demo_secret) {
        Ok(text) => {
            println!("P2P_ENVELOPE_AUTHENTICATED id={} bytes={}", envelope.id, text.len());
            publish(swarm, topic, WireMessage::Receipt(receipt_for(&envelope, local_peer.to_owned())))?;
        }
        Err(error) => println!("P2P_REJECTED_ENVELOPE id={} error={error}", envelope.id),
    }
    Ok(())
}
