import type { Session, TerminalPattern } from './types';

export type ContextSuggestion = { id: string; title: string; description: string; command: string };
type NetworkVendor = 'juniper' | 'cisco' | 'dell-os10';
export type TerminalContext = { id: string; vendor: NetworkVendor | 'linux' | 'docker' | 'kubernetes'; topic: 'interface' | 'bgp' | 'ospf' | 'bfd' | 'switching' | 'arp' | 'routing' | 'vrf' | 'service' | 'system' | 'container' | 'kubernetes'; label: string; summary: string; confidence: 'medium' | 'high'; suggestions: ContextSuggestion[]; highlights: TerminalPattern[] };

const clean = (value: string) => value.replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))/g, '').replace(/\r/g, '');
const lastMatch = (text: string, expression: RegExp) => { let found: RegExpExecArray | null = null; expression.lastIndex = 0; for (let match = expression.exec(text); match; match = expression.exec(text)) { found = match; if (!match[0].length) expression.lastIndex += 1; } return found; };
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const suggestion = (id: string, title: string, description: string, command: string): ContextSuggestion => ({ id, title, description, command });

function vendorFor(session: Session, text: string): TerminalContext['vendor'] | null {
  const identity = `${session.detectedIdentity?.vendor || ''} ${session.detectedIdentity?.product || ''} ${session.detectedIdentity?.evidence || ''}`;
  if (/juniper|junos|\b(?:ex|qfx|mx|srx)\d{2,}/i.test(identity) || /JUNOS|Juniper Networks/i.test(text)) return 'juniper';
  if (/dell|smartfabric|\bos10\b/i.test(identity) || /SmartFabric OS10|OS10 Enterprise|Dell EMC Networking/i.test(text)) return 'dell-os10';
  if (/cisco|ios|nx-os|asa|firepower/i.test(identity) || /Cisco IOS|Cisco NX-OS|Adaptive Security Appliance/i.test(text)) return 'cisco';
  if (/\b(?:kubectl|kubernetes|k8s)\b|CrashLoopBackOff|ImagePullBackOff|\bpod\/|\bdeployment\//i.test(text)) return 'kubernetes';
  if (/\b(?:docker|docker compose)\b|container id|docker\.service/i.test(text)) return 'docker';
  if (session.platform === 'linux' || /\b(?:systemctl|journalctl|apt|dnf|yum|kernel|GNU\/Linux)\b/i.test(text)) return 'linux';
  return null;
}

const interfaceExpressions: Record<NetworkVendor, RegExp> = {
  juniper: /\b((?:ge|xe|et|fe|ae)-\d+\/\d+\/\d+(?:\.\d+)?)\b/gi,
  cisco: /\b((?:(?:Fast|Gigabit|TenGigabit|TwentyFiveGigE|FortyGigabit|HundredGig)Ethernet|Ethernet|Port-channel|Loopback|Vlan)\s*\d+(?:\/\d+)*(?:\.\d+)?)\b/gi,
  'dell-os10': /\b((?:ethernet\s*\d+\/\d+\/\d+(?::\d+)?|port-channel\s*\d+|vlan\s*\d+|loopback\s*\d+))\b/gi,
};
const peerExpression = /\b((?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})\b/g;

function interfaceSuggestions(vendor: NetworkVendor, name: string) {
  if (vendor === 'juniper') return [
    suggestion('junos-interface-extensive', 'Show detailed interface state', 'Traffic, errors, carrier transitions and queue counters.', `show interfaces ${name} extensive`),
    suggestion('junos-interface-optics', 'Show optical diagnostics', 'Laser levels, receiver power and module alarms where supported.', `show interfaces diagnostics optics ${name}`),
    suggestion('junos-interface-log', 'Search interface logs', 'Find recent link and protocol events mentioning this interface.', `show log messages | match "${name}"`),
    suggestion('junos-interface-config', 'Show interface configuration', 'Display the active interface configuration in set format.', `show configuration interfaces ${name} | display set`),
  ];
  if (vendor === 'dell-os10') return [
    suggestion('os10-interface', 'Show interface details', 'Inspect state, counters, negotiation and recent transitions.', `show interface ${name}`),
    suggestion('os10-interface-errors', 'Show interface errors', 'Review drops, CRC errors and discard counters.', `show interface ${name} counters errors`),
    suggestion('os10-interface-config', 'Show interface configuration', 'Display the running configuration for this interface.', `show running-configuration interface ${name}`),
    suggestion('os10-interface-log', 'Search interface logs', 'Find recent events associated with this interface.', `show logging | grep -i "${name}"`),
  ];
  return [
    suggestion('cisco-interface', 'Show interface details', 'Inspect line state, rates, errors, drops and transitions.', `show interfaces ${name}`),
    suggestion('cisco-interface-errors', 'Show interface counters', 'Review error and discard counters across interfaces.', 'show interfaces counters errors'),
    suggestion('cisco-interface-config', 'Show interface configuration', 'Display the running configuration applied to this interface.', `show running-config interface ${name}`),
    suggestion('cisco-interface-log', 'Search interface logs', 'Find recent link or protocol events mentioning this interface.', `show logging | include ${name}`),
  ];
}

function protocolSuggestions(vendor: NetworkVendor, topic: 'bgp' | 'ospf' | 'bfd', peer?: string) {
  if (vendor === 'juniper') {
    if (topic === 'bgp') return [suggestion('junos-bgp-summary', 'Show BGP summary', 'Review all peers and their session state.', 'show bgp summary'), ...(peer ? [suggestion('junos-bgp-neighbour', 'Show neighbour details', 'Inspect state transitions, timers, capabilities and route counts.', `show bgp neighbor ${peer}`), suggestion('junos-bgp-routes', 'Show routes received from neighbour', 'Inspect routes currently received from this peer.', `show route receive-protocol bgp ${peer}`)] : [])];
    if (topic === 'ospf') return [suggestion('junos-ospf-neighbours', 'Show OSPF neighbours', 'Review adjacency state and neighbour uptime.', 'show ospf neighbor detail'), suggestion('junos-ospf-interfaces', 'Show OSPF interfaces', 'Review area, state, timers and designated routers.', 'show ospf interface extensive'), suggestion('junos-ospf-database', 'Show OSPF database summary', 'Inspect link-state database counts and entries.', 'show ospf database summary')];
    return [suggestion('junos-bfd', 'Show BFD sessions', 'Review session state, timers and diagnostic codes.', 'show bfd session extensive'), suggestion('junos-bfd-log', 'Search BFD logs', 'Find recent BFD state transitions.', 'show log messages | match BFD')];
  }
  if (vendor === 'dell-os10') {
    if (topic === 'bgp') return [suggestion('os10-bgp-summary', 'Show BGP summary', 'Review peers, state and prefix counts.', 'show ip bgp summary'), ...(peer ? [suggestion('os10-bgp-neighbour', 'Show neighbour details', 'Inspect timers, capabilities and session history.', `show ip bgp neighbors ${peer}`)] : []), suggestion('os10-bgp-routes', 'Show BGP routes', 'Inspect the BGP routing table.', 'show ip bgp')];
    if (topic === 'ospf') return [suggestion('os10-ospf-neighbours', 'Show OSPF neighbours', 'Review adjacency state and uptime.', 'show ip ospf neighbor detail'), suggestion('os10-ospf-interfaces', 'Show OSPF interfaces', 'Inspect OSPF interface state and timers.', 'show ip ospf interface')];
    return [suggestion('os10-bfd', 'Show BFD neighbours', 'Review BFD state, timers and diagnostics.', 'show bfd neighbors detail'), suggestion('os10-bfd-log', 'Search BFD logs', 'Find recent BFD events.', 'show logging | grep -i bfd')];
  }
  if (topic === 'bgp') return [suggestion('cisco-bgp-summary', 'Show BGP summary', 'Review peer state, uptime and prefix counts.', 'show bgp summary'), ...(peer ? [suggestion('cisco-bgp-neighbour', 'Show neighbour details', 'Inspect timers, capabilities, notifications and session history.', `show bgp neighbors ${peer}`)] : []), suggestion('cisco-bgp-routes', 'Show BGP routes', 'Inspect the current BGP routing table.', 'show bgp')];
  if (topic === 'ospf') return [suggestion('cisco-ospf-neighbours', 'Show OSPF neighbours', 'Review adjacency state and neighbour uptime.', 'show ip ospf neighbor detail'), suggestion('cisco-ospf-interfaces', 'Show OSPF interfaces', 'Inspect network type, timers and interface state.', 'show ip ospf interface'), suggestion('cisco-ospf-database', 'Show OSPF database', 'Inspect the link-state database.', 'show ip ospf database')];
  return [suggestion('cisco-bfd', 'Show BFD neighbours', 'Review session state, timers and diagnostics.', 'show bfd neighbors details'), suggestion('cisco-bfd-log', 'Search BFD logs', 'Find recent BFD state changes.', 'show logging | include BFD')];
}

function networkFundamentals(vendor: NetworkVendor, topic: 'switching' | 'arp' | 'routing' | 'vrf', value?: string) {
  if (vendor === 'juniper') {
    if (topic === 'switching') return [suggestion('junos-ethernet-switching', 'Show switching table', 'Inspect learned MAC addresses and interfaces.', 'show ethernet-switching table'), suggestion('junos-vlans', 'Show VLANs', 'Review VLAN membership and operational state.', 'show vlans'), ...(value ? [suggestion('junos-vlan-detail', `Show VLAN ${value}`, 'Inspect this VLAN and its attached interfaces.', `show vlans ${value} detail`)] : [])];
    if (topic === 'arp') return [suggestion('junos-arp', 'Show ARP table', 'Review IPv4 neighbour resolution.', value ? `show arp no-resolve | match "${value}"` : 'show arp no-resolve'), suggestion('junos-nd', 'Show IPv6 neighbours', 'Review IPv6 neighbour discovery entries.', 'show ipv6 neighbors')];
    if (topic === 'vrf') return [suggestion('junos-instances', 'Show routing instances', 'List VRFs and virtual routers.', 'show route instance'), ...(value ? [suggestion('junos-instance-routes', `Show ${value} routes`, 'Inspect routes within this routing instance.', `show route table ${value}.inet.0`)] : [])];
    return [suggestion('junos-route-summary', 'Show route summary', 'Review route counts by table and protocol.', 'show route summary'), ...(value ? [suggestion('junos-route-lookup', `Look up ${value}`, 'Inspect the selected destination and route preference.', `show route ${value} detail`)] : []), suggestion('junos-forwarding', 'Show forwarding entry', 'Inspect the active forwarding decision.', value ? `show route forwarding-table destination ${value}` : 'show route forwarding-table summary')];
  }
  const os10 = vendor === 'dell-os10'; const prefix = os10 ? 'os10' : 'cisco';
  if (topic === 'switching') return [suggestion(`${prefix}-mac`, 'Show MAC address table', 'Inspect learned MAC addresses and ports.', 'show mac address-table'), suggestion(`${prefix}-vlans`, 'Show VLANs', 'Review VLAN membership and state.', 'show vlan'), ...(value ? [suggestion(`${prefix}-vlan-detail`, `Show VLAN ${value}`, 'Inspect this VLAN and its assigned ports.', `show vlan id ${value}`)] : [])];
  if (topic === 'arp') return [suggestion(`${prefix}-arp`, 'Show ARP table', 'Review IPv4 neighbour resolution.', value ? `show ip arp ${value}` : 'show ip arp'), suggestion(`${prefix}-nd`, 'Show IPv6 neighbours', 'Review IPv6 neighbour entries.', 'show ipv6 neighbors')];
  if (topic === 'vrf') return [suggestion(`${prefix}-vrfs`, 'Show VRFs', 'List configured routing contexts.', 'show vrf'), ...(value ? [suggestion(`${prefix}-vrf-routes`, `Show ${value} routes`, 'Inspect the routing table for this VRF.', `show ip route vrf ${value}`)] : [])];
  return [suggestion(`${prefix}-routes`, 'Show routing table', 'Review installed IPv4 routes.', 'show ip route'), ...(value ? [suggestion(`${prefix}-route-lookup`, `Look up ${value}`, 'Inspect the best route for this destination.', `show ip route ${value}`)] : []), suggestion(`${prefix}-cef`, 'Show forwarding decision', 'Inspect the resolved forwarding path.', value ? `show ip cef ${value} detail` : 'show ip cef summary')];
}

function hostContext(vendor: 'linux' | 'docker' | 'kubernetes', text: string): TerminalContext {
  const unit = lastMatch(text, /\b([a-z0-9@_.-]+\.service)\b/gi)?.[1]; const container = lastMatch(text, /(?:container\s+|logs?\s+|inspect\s+)([a-z0-9][a-z0-9_.-]+)/gi)?.[1]; const kube = lastMatch(text, /(?:pod\/?|deployment\/?|service\/?)\s*([a-z0-9][a-z0-9.-]+)/gi)?.[1];
  if (vendor === 'kubernetes') return { id: `kubernetes:${kube || 'general'}`, vendor, topic: 'kubernetes', label: `Kubernetes${kube ? ` · ${kube}` : ''}`, summary: 'Kubernetes context detected. Suggestions inspect workload state, events, logs and resource use.', confidence: kube ? 'high' : 'medium', suggestions: [suggestion('kube-pods', 'Show pods', 'Review pod readiness, restarts, nodes and addresses.', 'kubectl get pods -A -o wide'), suggestion('kube-events', 'Show recent events', 'Inspect scheduling, image and health-check failures.', 'kubectl get events -A --sort-by=.lastTimestamp'), ...(kube ? [suggestion('kube-describe', `Describe ${kube}`, 'Show conditions, events, containers and probes.', `kubectl describe pod ${kube}`), suggestion('kube-logs', `Show ${kube} logs`, 'Read recent application output.', `kubectl logs ${kube} --tail=200`)] : []), suggestion('kube-top', 'Show resource use', 'Review pod CPU and memory where metrics-server is available.', 'kubectl top pods -A')], highlights: [{ id: 'context-kube-state', name: 'Kubernetes states', pattern: '\\b(?:CrashLoopBackOff|ImagePullBackOff|Pending|Failed|Evicted|Running|Ready)\\b', colour: '#f2be63', enabled: true }] };
  if (vendor === 'docker') return { id: `docker:${container || 'general'}`, vendor, topic: 'container', label: `Docker${container ? ` · ${container}` : ''}`, summary: 'Docker context detected. Suggestions inspect containers, logs, health, resources and storage.', confidence: container ? 'high' : 'medium', suggestions: [suggestion('docker-ps', 'Show all containers', 'Review container state, ports and names.', 'docker ps -a'), suggestion('docker-stats', 'Show resource snapshot', 'Inspect current container CPU and memory use.', 'docker stats --no-stream'), ...(container ? [suggestion('docker-inspect', `Inspect ${container}`, 'Show configuration, health and runtime state.', `docker inspect ${container}`), suggestion('docker-logs', `Show ${container} logs`, 'Read recent container output.', `docker logs --tail 200 ${container}`)] : []), suggestion('docker-disk', 'Show Docker disk use', 'Review image, container, volume and build-cache usage.', 'docker system df')], highlights: [{ id: 'context-docker-state', name: 'Container states', pattern: '\\b(?:healthy|unhealthy|exited|restarting|dead|running)\\b', colour: '#f2be63', enabled: true }] };
  const disk = /no space left|filesystem|disk|df\b|mount/i.test(text); const network = /network|route|socket|address|connection|dns|resolv/i.test(text);
  return { id: `linux:${unit || (disk ? 'disk' : network ? 'network' : 'system')}`, vendor, topic: unit ? 'service' : 'system', label: unit ? `Linux service · ${unit}` : disk ? 'Linux · Storage' : network ? 'Linux · Networking' : 'Linux · System', summary: 'Linux context detected. Suggestions provide read-only service, resource, log and network diagnostics.', confidence: unit || disk || network ? 'high' : 'medium', suggestions: unit ? [suggestion('linux-unit-status', `Show ${unit} status`, 'Inspect state and recent failure details.', `systemctl status ${unit} --no-pager`), suggestion('linux-unit-logs', `Show ${unit} logs`, 'Read recent journal entries for this service.', `journalctl -u ${unit} -n 200 --no-pager`)] : disk ? [suggestion('linux-df', 'Show filesystem use', 'Review mounted filesystem capacity.', 'df -hT'), suggestion('linux-inodes', 'Show inode use', 'Detect inode exhaustion.', 'df -ih'), suggestion('linux-large', 'Show largest top-level paths', 'Estimate disk use without changing files.', 'sudo du -xhd1 / 2>/dev/null | sort -h')] : network ? [suggestion('linux-addresses', 'Show addresses', 'Review links and assigned addresses.', 'ip -br address'), suggestion('linux-routes', 'Show routes', 'Review the active routing table.', 'ip route'), suggestion('linux-sockets', 'Show listening sockets', 'Review listening TCP and UDP services.', 'ss -lntup')] : [suggestion('linux-top', 'Show system pressure', 'Review load, CPU and memory snapshot.', 'top -b -n1 | head -40'), suggestion('linux-memory', 'Show memory use', 'Review RAM and swap availability.', 'free -h'), suggestion('linux-failures', 'Show failed services', 'List failed systemd units.', 'systemctl --failed --no-pager'), suggestion('linux-errors', 'Show recent system errors', 'Read high-priority journal messages.', 'journalctl -p err -n 100 --no-pager')], highlights: [{ id: 'context-linux-state', name: 'Linux problems', pattern: '\\b(?:failed|failure|error|critical|oom|denied|unreachable|timeout)\\b', colour: '#ff767d', enabled: true }] };
}

export function detectTerminalContext(session: Session, rawText: string): TerminalContext | null {
  const text = clean(rawText).slice(-16000); const vendor = vendorFor(session, text); if (!vendor) return null;
  if (vendor === 'linux' || vendor === 'docker' || vendor === 'kubernetes') return hostContext(vendor, text);
  const candidates: Array<{ index: number; context: TerminalContext }> = [];
  const interfaceMatch = lastMatch(text, interfaceExpressions[vendor]);
  if (interfaceMatch && /interface|protocol|link|input|output|error|drop|crc|carrier|optic|transceiver|up|down/i.test(text.slice(Math.max(0, interfaceMatch.index - 180), interfaceMatch.index + interfaceMatch[0].length + 300))) {
    const name = interfaceMatch[1].replace(/\s+/g, '');
    candidates.push({ index: interfaceMatch.index, context: { id: `${vendor}:interface:${name.toLowerCase()}`, vendor, topic: 'interface', label: `Interface · ${name}`, summary: 'Interface context detected. Suggested commands are read-only checks for state, errors, optics, logs and configuration.', confidence: 'high', suggestions: interfaceSuggestions(vendor, name), highlights: [{ id: 'context-object', name: 'Detected interface', pattern: escapeRegex(interfaceMatch[1]), colour: '#72b7ff', enabled: true }, { id: 'context-errors', name: 'Interface problems', pattern: '\\b(?:down|error(?:s)?|drop(?:s|ped)?|discard(?:s|ed)?|crc|fault|alarm)\\b', colour: '#ff767d', enabled: true }] } });
  }
  for (const topic of ['bgp', 'ospf', 'bfd'] as const) {
    const topicMatch = lastMatch(text, new RegExp(`\\b${topic}\\b`, 'gi')); if (!topicMatch) continue;
    const nearby = text.slice(Math.max(0, topicMatch.index - 400), topicMatch.index + 800); const peer = lastMatch(nearby, peerExpression)?.[1];
    candidates.push({ index: topicMatch.index, context: { id: `${vendor}:${topic}:${peer || 'general'}`, vendor, topic, label: `${topic.toUpperCase()}${peer ? ` · ${peer}` : ''}`, summary: `${topic.toUpperCase()} context detected. Suggestions inspect protocol state, peers, timers and routing information without changing configuration.`, confidence: peer ? 'high' : 'medium', suggestions: protocolSuggestions(vendor, topic, peer), highlights: [{ id: 'context-protocol', name: `${topic.toUpperCase()} state`, pattern: `\\b(?:${topic}|established|full|up|down|idle|active|connect|exstart|exchange|loading|flap(?:ped|ping)?|timeout|failed?)\\b`, colour: '#f2be63', enabled: true }, ...(peer ? [{ id: 'context-peer', name: 'Detected peer', pattern: escapeRegex(peer), colour: '#72b7ff', enabled: true }] : [])] } });
  }
  for (const topic of ['switching', 'arp', 'routing', 'vrf'] as const) {
    const expression = topic === 'switching' ? /\b(?:vlan|mac address|ethernet-switching|switchport|bridge)\b/gi : topic === 'arp' ? /\b(?:arp|neighbor discovery|ipv6 neighbor)\b/gi : topic === 'routing' ? /\b(?:routing table|ip route|show route|route lookup|forwarding table)\b/gi : /\b(?:vrf|routing instance|virtual router)\b/gi;
    const match = lastMatch(text, expression); if (!match) continue; const nearby = text.slice(Math.max(0, match.index - 300), match.index + 600); const ip = lastMatch(nearby, peerExpression)?.[1]; const vlan = topic === 'switching' ? lastMatch(nearby, /\b(?:vlan\s*)?(\d{1,4})\b/gi)?.[1] : undefined; const vrf = topic === 'vrf' ? lastMatch(nearby, /\b(?:vrf|routing-instance|instance)\s+([a-z0-9_.-]+)/gi)?.[1] : undefined; const value = topic === 'switching' ? vlan : topic === 'vrf' ? vrf : ip;
    candidates.push({ index: match.index, context: { id: `${vendor}:${topic}:${value || 'general'}`, vendor, topic, label: `${topic === 'switching' ? 'Switching' : topic === 'arp' ? 'ARP / neighbours' : topic === 'routing' ? 'Routing' : 'VRF'}${value ? ` · ${value}` : ''}`, summary: `${topic === 'switching' ? 'Layer 2 switching' : topic === 'arp' ? 'Neighbour resolution' : topic === 'routing' ? 'Routing table' : 'Virtual routing'} context detected. Suggestions inspect operational state without changing configuration.`, confidence: value ? 'high' : 'medium', suggestions: networkFundamentals(vendor, topic, value), highlights: [{ id: 'context-network-object', name: 'Detected network object', pattern: value ? escapeRegex(value) : '\\b(?:vlan|arp|route|vrf)\\b', colour: '#72b7ff', enabled: true }] } });
  }
  return candidates.sort((left, right) => right.index - left.index)[0]?.context ?? null;
}
