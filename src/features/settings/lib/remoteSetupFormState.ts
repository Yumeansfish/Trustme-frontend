export interface RemoteSetupBusyState {
  loading: boolean;
  saving: boolean;
  testingConnection: boolean;
}

export interface RemoteSetupSaveState extends RemoteSetupBusyState {
  loaded: boolean;
  valid: boolean;
  dirty: boolean;
}

export function remoteSetupFieldsDisabled(state: RemoteSetupBusyState): boolean {
  return state.loading || state.saving || state.testingConnection;
}

export function remoteSetupSaveDisabled(state: RemoteSetupSaveState): boolean {
  return !state.loaded || remoteSetupFieldsDisabled(state) || !state.valid || !state.dirty;
}

export function remoteParticipantLocked(participantName: string): boolean {
  return participantName.trim().length > 0;
}
