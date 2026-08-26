use std::{error::Error, num::NonZeroU32, path::PathBuf, time::Duration};

use clap::Parser;
use futures::StreamExt;
use libp2p::{
    identify, noise, ping, relay,
    swarm::{NetworkBehaviour, SwarmEvent},
    tcp, yamux, Multiaddr,
};
use meshline_p2p_demo::identity::load_or_create_identity;
use tokio::{select, time::interval};
use tracing_subscriber::EnvFilter;

#[derive(Debug, Parser)]
#[command(
    name = "meshline-relay",
    about = "Bounded Circuit Relay v2 harness for Meshline development. Not a production relay."
)]
struct Args {
    #[arg(long, default_value_t = 4020)]
    port: u16,

    /// Persistent harness-only libp2p identity. This is not a Meshline account key.
    #[arg(long, env = "MESHLINE_RELAY_IDENTITY_FILE", default_value = "./meshline-relay.identity")]
    identity_file: PathBuf,

    /// Public address advertised for a real internet test, for example /ip4/203.0.113.10/tcp/4020.
    #[arg(long)]
    public_address: Option<Multiaddr>,

    #[arg(long, default_value_t = 2)]
    max_reservations: usize,

    #[arg(long, default_value_t = 1)]
    max_reservations_per_peer: usize,

    #[arg(long, default_value_t = 300)]
    reservation_seconds: u64,

    #[arg(long, default_value_t = 2)]
    max_circuits: usize,

    #[arg(long, default_value_t = 1)]
    max_circuits_per_peer: usize,

    #[arg(long, default_value_t = 60)]
    max_circuit_seconds: u64,

    #[arg(long, default_value_t = 65_536)]
    max_circuit_bytes: u64,

    #[arg(long, default_value_t = 90)]
    run_seconds: u64,
}

#[derive(NetworkBehaviour)]
struct RelayBehaviour {
    relay: relay::Behaviour,
    identify: identify::Behaviour,
    ping: ping::Behaviour,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .try_init();
    let args = Args::parse();
    let identity = load_or_create_identity(&args.identity_file)?;
    let relay_config = relay::Config {
        max_reservations: args.max_reservations,
        max_reservations_per_peer: args.max_reservations_per_peer,
        reservation_duration: Duration::from_secs(args.reservation_seconds),
        max_circuits: args.max_circuits,
        max_circuits_per_peer: args.max_circuits_per_peer,
        max_circuit_duration: Duration::from_secs(args.max_circuit_seconds),
        max_circuit_bytes: args.max_circuit_bytes,
        ..relay::Config::default()
    }
    .reservation_rate_per_peer(
        NonZeroU32::new(4).expect("nonzero prototype reservation rate"),
        Duration::from_secs(60),
    )
    .circuit_src_per_peer(
        NonZeroU32::new(8).expect("nonzero prototype circuit rate"),
        Duration::from_secs(60),
    );

    let mut swarm = libp2p::SwarmBuilder::with_existing_identity(identity)
        .with_tokio()
        .with_tcp(tcp::Config::default(), noise::Config::new, yamux::Config::default)?
        .with_quic()
        .with_behaviour(|key| RelayBehaviour {
            relay: relay::Behaviour::new(key.public().to_peer_id(), relay_config),
            identify: identify::Behaviour::new(identify::Config::new(
                "/meshline/relay-probe/1.0.0".into(),
                key.public(),
            )),
            ping: ping::Behaviour::new(ping::Config::new()),
        })?
        .build();

    let local_peer = swarm.local_peer_id().to_string();
    if let Some(public_address) = args.public_address {
        swarm.add_external_address(public_address.clone());
        println!("RELAY_PUBLIC_ADDRESS {public_address}/p2p/{local_peer}");
    }
    swarm.listen_on(format!("/ip4/0.0.0.0/tcp/{}", args.port).parse()?)?;
    swarm.listen_on(format!("/ip4/0.0.0.0/udp/{}/quic-v1", args.port).parse()?)?;
    println!("MESHLINE_RELAY_PEER {local_peer}");
    println!("RELAY_IDENTITY_FILE {}", args.identity_file.display());
    println!(
        "RELAY_LIMITS reservations={} reservations_per_peer={} circuits={} circuits_per_peer={} circuit_seconds={} circuit_bytes={}",
        args.max_reservations,
        args.max_reservations_per_peer,
        args.max_circuits,
        args.max_circuits_per_peer,
        args.max_circuit_seconds,
        args.max_circuit_bytes,
    );
    println!("SCOPE transparent Circuit Relay v2 transport only; no message storage, directory, or plaintext handling");

    let deadline = if args.run_seconds == 0 {
        None
    } else {
        Some(tokio::time::Instant::now() + Duration::from_secs(args.run_seconds))
    };
    let mut ticker = interval(Duration::from_millis(500));

    loop {
        select! {
            _ = ticker.tick() => {
                if deadline.is_some_and(|limit| tokio::time::Instant::now() >= limit) {
                    println!("RELAY_PROBE_COMPLETE timeout");
                    return Ok(());
                }
            }
            event = swarm.select_next_some() => match event {
                SwarmEvent::NewListenAddr { address, .. } => println!("RELAY_LISTEN {address}/p2p/{local_peer}"),
                SwarmEvent::Behaviour(RelayBehaviourEvent::Relay(event)) => println!("RELAY_EVENT {event:?}"),
                SwarmEvent::Behaviour(RelayBehaviourEvent::Identify(identify::Event::Received { info, .. })) => {
                    swarm.add_external_address(info.observed_addr);
                }
                _ => {}
            }
        }
    }
}
