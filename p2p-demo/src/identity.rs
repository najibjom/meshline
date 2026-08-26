use std::{error::Error, fs, path::Path};

use libp2p::identity::Keypair;

/// Loads a local test identity or creates one with owner-only permissions.
/// These identities are for the P2P harness only; they are not Meshline account keys.
pub fn load_or_create_identity(path: &Path) -> Result<Keypair, Box<dyn Error>> {
    if path.exists() {
        return Ok(Keypair::from_protobuf_encoding(&fs::read(path)?)?);
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let keypair = Keypair::generate_ed25519();
    fs::write(path, keypair.to_protobuf_encoding()?)?;
    restrict_permissions(path)?;
    Ok(keypair)
}

#[cfg(unix)]
fn restrict_permissions(path: &Path) -> Result<(), Box<dyn Error>> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    Ok(())
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &Path) -> Result<(), Box<dyn Error>> {
    Ok(())
}
