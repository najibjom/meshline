use std::{error::Error, time::Duration};

use clap::{Parser, ValueEnum};
use futures::StreamExt;
use libp2p::{
    core::multiaddr::Protocol,
    dcutr, identify, noise, ping, relay,
    swarm::{NetworkBehaviour, SwarmEvent},
    tcp, yamux, Multiaddr, PeerId,
};
use tokio::{select, time::interval};
use tracing_subscriber::EnvFilter;

#[derive(Debug, Clone, Copy, ValueEnum)]
enum Mode {
    Listener,
    Dialer,
}

#[derive(Debug, Parser)]
#[command(
    name = "meshline-relay-client",
    about = "Local Circuit Relay/DCUtR reachability probe for Meshline development."
)]
struct Args {
    #[arg(long, value_enum)]
    mode: Mode,

    /// Include the relay peer ID in this multiaddress, for example /ip4/127.0.0.1/tcp/4020/p2p/RELAY.
    #[arg(long)]
    relay: Multiaddr,

    /// Required for a dialer. This is the listener's libp2p peer ID.
    #[arg(long)]
    remote_peer: Option<PeerId>,

    #[arg(long, default_value_t = 45)]
    run_seconds: u64,
}

#[derive(NetworkBehaviour)]
struct ClientBehaviour {
    relay_client: relay::client::Behaviour,
    identify: identify::Behaviour,
    dcutr: dcutr::Behaviour,
    ping: ping::Behaviour,
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

    let mut swarm = libp2p::SwarmBuilder::with_new_identity()
        .with_tokio()
        .with_tcp(
            tcp::Config::default().nodelay(true),
            noise::Config::new,
            yamux::Config::default,
        )?
        .with_quic()
        .with_relay_client(noise::Config::new, yamux::Config::default)?
        .with_behaviour(|key, relay_client| ClientBehaviour {
            relay_client,
            identify: identify::Behaviour::new(identify::Config::new(
                "/meshline/relay-probe/1.0.0".into(),
                key.public(),
            )),
            dcutr: dcutr::Behaviour::new(key.public().to_peer_id()),
            ping: ping::Behaviour::new(ping::Config::new()),
        })?
        .build();

    let local_peer = swarm.local_peer_id().to_string();
    swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse()?)?;
    swarm.listen_on("/ip4/0.0.0.0/udp/0/quic-v1".parse()?)?;
    swarm.dial(args.relay.clone())?;
    println!("MESHLINE_RELAY_CLIENT_PEER {local_peer}");
    println!("SCOPE relay reservation and relayed-connection probe; no message storage or production privacy claim");

    let deadline = args
        .run_seconds
        .checked_sub(0)
        .filter(|seconds| *seconds > 0)
        .map(|seconds| tokio::time::Instant::now() + Duration::from_secs(seconds));
    let mut requested_route = false;
    let mut ticker = interval(Duration::from_millis(500));

    loop {
        select! {
            _ = ticker.tick() => {
                if deadline.is_some_and(|limit| tokio::time::Instant::now() >= limit) {
                    println!("RELAY_CLIENT_PROBE_COMPLETE timeout");
                    return Ok(());
                }
            }
            event = swarm.select_next_some() => match event {
                SwarmEvent::NewListenAddr { address, .. } => println!("CLIENT_LISTEN {address}/p2p/{local_peer}"),
                SwarmEvent::ConnectionEstablished { peer_id, endpoint, .. } => {
                    println!("CLIENT_CONNECTED peer={peer_id} endpoint={endpoint:?}");
                    if endpoint
                        .get_remote_address()
                        .iter()
                        .any(|protocol| matches!(protocol, Protocol::P2pCircuit))
                    {
                        println!("RELAY_CONNECTION_ESTABLISHED remote={peer_id}");
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
                SwarmEvent::Behaviour(ClientBehaviourEvent::Dcutr(event)) => println!("DCUTR_EVENT {event:?}"),
                SwarmEvent::OutgoingConnectionError { peer_id, error, .. } => println!("RELAY_CONNECTION_ERROR peer={peer_id:?} error={error}"),
                _ => {}
            }
        }
    }
}
