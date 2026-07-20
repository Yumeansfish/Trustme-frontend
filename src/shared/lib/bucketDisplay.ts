type BucketPresentation = {
  displayName: string;
  groupTitle: string;
};

type BucketIdentity = {
  id?: string;
  hostname?: string;
  device_id?: string;
  data?: Record<string, unknown>;
};

const KNOWN_BUCKET_PRESENTATIONS: Record<string, BucketPresentation> = {
  'aw-watcher-window': {
    displayName: 'trustme-window bucket',
    groupTitle: 'window-bucket',
  },
  'aw-watcher-afk': {
    displayName: 'trustme-presence bucket',
    groupTitle: 'presence-bucket',
  },
  'aw-watcher-firefox': {
    displayName: 'trustme-browser bucket',
    groupTitle: 'browser-bucket',
  },
  'aw-watcher-web-firefox': {
    displayName: 'trustme-browser bucket',
    groupTitle: 'browser-bucket',
  },
  'aw-watcher-vscode': {
    displayName: 'trustme-editor bucket',
    groupTitle: 'editor-bucket',
  },
  'aw-stopwatch': {
    displayName: 'trustme-away bucket',
    groupTitle: 'away-bucket',
  },
};

const KNOWN_MODULE_LABELS: Record<string, string> = {
  'aw-server': 'trustme-backend',
  'aw-watcher-afk': 'trustme-presence',
  'aw-watcher-window': 'trustme-window',
  'aw-watcher-input': 'trustme-input',
  'aw-watcher-web': 'trustme-browser',
  'aw-watcher-vscode': 'trustme-editor',
  'aw-notify': 'trustme-checkins',
};

export function getBucketHostname(bucket: BucketIdentity): string {
  const dataHostname = bucket.data?.hostname;
  return bucket.hostname || (typeof dataHostname === 'string' ? dataHostname : '') || bucket.device_id || 'Unknown';
}

export function getBucketBaseId(bucket: BucketIdentity | string, hostname = ''): string {
  let bucketId = typeof bucket === 'string' ? bucket : bucket.id || '';
  const resolvedHostname = typeof bucket === 'string' ? hostname : getBucketHostname(bucket);
  const suffix = resolvedHostname && resolvedHostname !== 'Unknown' ? `_${resolvedHostname}` : '';
  if (suffix && bucketId.endsWith(suffix)) {
    bucketId = bucketId.slice(0, -suffix.length);
  }
  return bucketId;
}

export function formatBucketDisplayName(bucket: BucketIdentity | string, hostname = ''): string {
  const bucketId = getBucketBaseId(bucket, hostname);
  const presentation = KNOWN_BUCKET_PRESENTATIONS[bucketId];
  if (presentation) {
    return presentation.displayName;
  }
  if (bucketId.startsWith('aw-watcher-')) {
    return `trustme-${bucketId.slice('aw-watcher-'.length)} bucket`;
  }
  if (bucketId.startsWith('aw-')) {
    return `trustme-${bucketId.slice(3)} bucket`;
  }
  return bucketId ? `${bucketId} bucket` : 'trustme bucket';
}

export function formatBucketGroupTitle(bucketId: string): string {
  const presentation = KNOWN_BUCKET_PRESENTATIONS[bucketId];
  if (presentation) {
    return presentation.groupTitle;
  }
  if (bucketId.startsWith('aw-watcher-')) {
    return `${bucketId.slice('aw-watcher-'.length)}-bucket`;
  }
  if (bucketId.startsWith('aw-')) {
    return `${bucketId.slice(3)}-bucket`;
  }
  return bucketId ? `${bucketId}-bucket` : 'bucket';
}

export function formatModuleDisplayName(moduleName: string | null | undefined): string {
  if (!moduleName) {
    return 'Unknown';
  }
  if (moduleName in KNOWN_MODULE_LABELS) {
    return KNOWN_MODULE_LABELS[moduleName];
  }
  if (moduleName.startsWith('aw-')) {
    return `trustme-${moduleName.slice(3)}`;
  }
  return moduleName;
}
