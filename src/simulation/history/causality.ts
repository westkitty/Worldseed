// Causal History Graph Engine & "WHY?" Deep-Reasoning Investigator

import { CausalLink, CausalNode, WorldState } from '../../types/simulation';

export class CausalityEngine {
  // Add or get causal node
  public static ensureNode(
    graph: Record<string, CausalNode>,
    id: string,
    title: string,
    entityType: string,
    entityId: string,
    year: number,
    summary: string
  ): CausalNode {
    if (!graph[id]) {
      graph[id] = {
        id,
        title,
        entityType,
        entityId,
        yearOccurred: year,
        summary,
        incomingCauses: [],
        outgoingConsequences: []
      };
    }
    return graph[id];
  }

  // Connect cause -> consequence
  public static link(
    graph: Record<string, CausalNode>,
    causeNodeId: string,
    consequenceNodeId: string,
    relationship: CausalLink['relationship'],
    description: string
  ) {
    const cause = graph[causeNodeId];
    const consequence = graph[consequenceNodeId];
    if (!cause || !consequence) return;

    // Avoid duplicate links
    if (!cause.outgoingConsequences.some(l => l.targetId === consequenceNodeId)) {
      cause.outgoingConsequences.push({
        targetId: consequenceNodeId,
        targetType: consequence.entityType as any,
        relationship,
        description
      });
    }

    if (!consequence.incomingCauses.some(l => l.targetId === causeNodeId)) {
      consequence.incomingCauses.push({
        targetId: causeNodeId,
        targetType: cause.entityType as any,
        relationship: 'CAUSED_BY',
        description
      });
    }
  }

  // Generate deep "WHY?" explanation narrative for any entity or node
  public static explainWhy(
    targetNodeId: string,
    state: WorldState,
    maxDepth: number = 6
  ): {
    headline: string;
    chainSteps: Array<{
      nodeId: string;
      year: number;
      title: string;
      entityType: string;
      summary: string;
      roleDescription: string;
    }>;
    fullNarrative: string;
  } {
    const node = state.causalGraph[targetNodeId];
    if (!node) {
      return {
        headline: 'Origin Unknown',
        chainSteps: [],
        fullNarrative: 'This entity has no recorded causal antecedents in the historical ledger.'
      };
    }

    const visited = new Set<string>();
    const chainSteps: Array<{
      nodeId: string;
      year: number;
      title: string;
      entityType: string;
      summary: string;
      roleDescription: string;
    }> = [];

    // Traverse incoming causes backwards in time
    let currentNode: CausalNode | undefined = node;
    let currentRole = 'Subject of inquiry';

    while (currentNode && chainSteps.length < maxDepth && !visited.has(currentNode.id)) {
      visited.add(currentNode.id);

      chainSteps.unshift({
        nodeId: currentNode.id,
        year: currentNode.yearOccurred,
        title: currentNode.title,
        entityType: currentNode.entityType,
        summary: currentNode.summary,
        roleDescription: currentRole
      });

      if (currentNode.incomingCauses.length > 0) {
        const nextLink: CausalLink = currentNode.incomingCauses[0];
        currentRole = nextLink.description;
        currentNode = state.causalGraph[nextLink.targetId];
      } else {
        break;
      }
    }

    // Build synthesized chronological narrative
    const parts: string[] = [];
    parts.push(`Historical Causal Genesis of ${node.title}:`);

    for (let i = 0; i < chainSteps.length; i++) {
      const step = chainSteps[i];
      if (i === 0) {
        parts.push(`• [Year ${step.year}] Primary Origin: ${step.title} (${step.summary}).`);
      } else if (i === chainSteps.length - 1) {
        parts.push(`• [Year ${step.year}] Culmination: ${step.title} emerged due to ${step.roleDescription.toLowerCase()}.`);
      } else {
        parts.push(`• [Year ${step.year}] Cascade: ${step.title} occurred, which ${step.roleDescription.toLowerCase()}.`);
      }
    }

    return {
      headline: `Why ${node.title} Exists / Occurred`,
      chainSteps,
      fullNarrative: parts.join('\n\n')
    };
  }
}
