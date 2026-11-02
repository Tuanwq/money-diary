/** A freshly created local default must never replace a remote user snapshot. */
export function shouldLoadRemoteAuxiliaryState(
  hasStoredLocalState: boolean,
  localUpdatedAt: string,
  remoteUpdatedAt: string,
) {
  return !hasStoredLocalState || Date.parse(remoteUpdatedAt) > Date.parse(localUpdatedAt);
}
