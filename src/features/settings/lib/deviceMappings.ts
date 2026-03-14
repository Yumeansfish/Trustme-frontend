export const DEFAULT_DEVICE_GROUP_NAME = 'My macbook';

function normalizeHosts(hosts: string[], knownHosts: string[]): string[] {
  const knownHostSet = new Set(knownHosts.filter(host => host && host !== 'unknown'));
  const seen = new Set<string>();

  return hosts.filter(host => {
    if (!host || host === 'unknown' || !knownHostSet.has(host) || seen.has(host)) {
      return false;
    }
    seen.add(host);
    return true;
  });
}

export function getCustomDeviceMappings(
  deviceMappings: Record<string, string[]> | null | undefined,
  knownHosts: string[]
): Record<string, string[]> {
  const mappings = deviceMappings || {};
  const customMappings: Record<string, string[]> = {};
  const assignedHosts = new Set<string>();

  for (const [groupName, hosts] of Object.entries(mappings)) {
    if (groupName === DEFAULT_DEVICE_GROUP_NAME) continue;

    const normalizedHosts = normalizeHosts(Array.isArray(hosts) ? hosts : [], knownHosts).filter(
      host => !assignedHosts.has(host)
    );

    if (normalizedHosts.length === 0) continue;

    normalizedHosts.forEach(host => assignedHosts.add(host));
    customMappings[groupName] = normalizedHosts;
  }

  return customMappings;
}

export function getEffectiveDeviceMappings(
  deviceMappings: Record<string, string[]> | null | undefined,
  knownHosts: string[]
): Record<string, string[]> {
  const validHosts = knownHosts.filter(host => host && host !== 'unknown');
  const customMappings = getCustomDeviceMappings(deviceMappings, validHosts);
  const assignedHosts = new Set(Object.values(customMappings).flat());
  const defaultHosts = validHosts.filter(host => !assignedHosts.has(host));

  return defaultHosts.length > 0
    ? { [DEFAULT_DEVICE_GROUP_NAME]: defaultHosts, ...customMappings }
    : customMappings;
}

export function expandHostsToEffectiveGroup(
  hosts: string[],
  deviceMappings: Record<string, string[]> | null | undefined,
  knownHosts: string[]
): string[] {
  const requestedHosts = normalizeHosts(hosts, knownHosts);
  if (requestedHosts.length === 0) {
    return [];
  }

  const effectiveMappings = getEffectiveDeviceMappings(deviceMappings, knownHosts);
  const expandedHosts = new Set<string>();

  for (const requestedHost of requestedHosts) {
    const matchingGroupHosts = Object.values(effectiveMappings).find(groupHosts =>
      groupHosts.includes(requestedHost)
    );

    if (matchingGroupHosts && matchingGroupHosts.length > 0) {
      matchingGroupHosts.forEach(host => expandedHosts.add(host));
    } else {
      expandedHosts.add(requestedHost);
    }
  }

  return [...expandedHosts];
}
