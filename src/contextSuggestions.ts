import type { Session, TerminalPattern } from './types';

export type ContextSuggestion = { id: string; title: string; description: string; command: string };
export type TerminalContext = { id: string; vendor: 'juniper' | 'cisco' | 'dell-os10'; topic: 'interface' | 'bgp' | 'ospf' | 'bfd'; label: string; summary: string; confidence: 'medium' | 'high'; suggestions: ContextSuggestion[]; highlights: TerminalPattern[] };

const clean = (value: string) => value.replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))/g, '').replace(/\r/g, '');
const lastMatch = (text: string, expression: RegExp) => { let found: RegExpExecArray | null = null; expression.lastIndex = 0; for (let match = expression.exec(text); match; match = expression.exec(text)) { found = match; if (!match[0].length) expression.lastIndex += 1; } return found; };
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const suggestion = (id: string, title: string, description: string, command: string): ContextSuggestion => ({ id, title, description, command });

function vendorFor(session: Session, text: string): TerminalContext['vendor'] | null {
  const identity = `${session.detectedIdentity?.vendor || ''} ${session.detectedIdentity?.product || ''} ${session.detectedIdentity?.evidence || ''}`;
  if (/juniper|junos|\b(?:ex|qfx|mx|srx)\d{2,}/i.test(identity) || /JUNOS|Juniper Networks/i.test(text)) return 'juniper';
  if (/dell|smartfabric|\bos10\b/i.test(identity) || /SmartFabric OS10|OS10 Enterprise|Dell EMC Networking/i.test(text)) return 'dell-os10';
  if (/cisco|ios|nx-os|asa|firepower/i.test(identity) || /Cisco IOS|Cisco NX-OS|Adaptive Security Appliance/i.test(text)) return 'cisco';
  return null;
}

const interfaceExpressions: Record<TerminalContext['vendor'], RegExp> = {
  juniper: /\b((?:ge|xe|et|fe|ae)-\d+\/\d+\/\d+(?:\.\d+)?)\b/gi,
  cisco: /\b((?:(?:Fast|Gigabit|TenGigabit|TwentyFiveGigE|FortyGigabit|HundredGig)Ethernet|Ethernet|Port-channel|Loopback|Vlan)\s*\d+(?:\/\d+)*(?:\.\d+)?)\b/gi,
  'dell-os10': /\b((?:ethernet\s*\d+\/\d+\/\d+(?::\d+)?|port-channel\s*\d+|vlan\s*\d+|loopback\s*\d+))\b/gi,
};
const peerExpression = /\b((?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})\b/g;

function interfaceSuggestions(vendor: TerminalContext['vendor'], name: string) {
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

function protocolSuggestions(vendor: TerminalContext['vendor'], topic: 'bgp' | 'ospf' | 'bfd', peer?: string) {
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

export function detectTerminalContext(session: Session, rawText: string): TerminalContext | null {
  const text = clean(rawText).slice(-16000); const vendor = vendorFor(session, text); if (!vendor) return null;
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
  return candidates.sort((left, right) => right.index - left.index)[0]?.context ?? null;
}
