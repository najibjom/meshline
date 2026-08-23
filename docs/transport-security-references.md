# Meshline Transport Security References

Meshline’s current direct-text relay remains an experimental proof. The next transport milestones should be designed against the following public specifications rather than represented as production end-to-end encryption before an audit.

- Signal, **X3DH Key Agreement Protocol**: https://signal.org/docs/specifications/x3dh/
- Signal, **The Double Ratchet Algorithm**: https://signal.org/docs/specifications/doubleratchet/
- Signal, **Automatic Key Verification**: https://support.signal.org/hc/en-us/articles/10223569377562-Automatic-Key-Verification

The immediate implementation only records observed public transport-key fingerprints and surfaces changed-key warnings. It does not implement X3DH, Double Ratchet, signed prekeys, one-time prekeys, key transparency, or automatic identity verification.
