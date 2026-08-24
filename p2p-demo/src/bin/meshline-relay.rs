use std::{error::Error, time::Duration};

use clap::Parser;
use futures::StreamExt;
use libp2p::{
    identify, noise, ping, relay,
    swarm::{NetworkBehaviour, SwarmEvent},
    tcp, yamux,
};
use tokio::{select, time::interval};
use tracing_subscriber::EnvFilter;

#[derive(Debug, Parser)]
#[command(
    name = "meshline-relay",
    about = "Local Circuit Relay harness for Meshline development. Not a production relay."
)]
struct Args {
    #[arg(long, default_value_t = 4020)]
    port: u16,

    #[arg(long, default_value_t = 45)]
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

    let mut swarm = libp2p::SwarmBuilder::with_new_identity()
        .with_tokio()
        .with_tcp(
            tcp::Config::default(),
            noise::Config::new,
            yamux::Config::default,
        )?
        .with_quic()
        .with_behaviour(|key| RelayBehaviour {
            relay: relay::Behaviour::new(key.public().to_peer_id(), Default::default()),
            identify: identify::Behaviour::new(identify::Config::new(
                "/meshline/relay-probe/1.0.0".into(),
                key.public(),
            )),
            ping: ping::Behaviour::new(ping::Config::new()),
        })?
        .build();

    let local_peer = swarm.local_peer_id().to_string();
    swarm.listen_on(format!("/ip4/0.0.0.0/tcp/{}", args.port).parse()?)?;
    swarm.listen_on(format!("/ip4/0.0.0.0/udp/{}/quic-v1", args.port).parse()?)?;
    println!("MESHLINE_RELAY_PEER {local_peer}");
    println!("SCOPE local Circuit Relay reachability harness; no message persistence or plaintext handling");

    let deadline = args
        .run_seconds
        .checked_sub(0)
        .filter(|seconds| *seconds > 0)
        .map(|seconds| tokio::time::Instant::now() + Duration::from_secs(seconds));
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
