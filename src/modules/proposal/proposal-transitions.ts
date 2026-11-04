import { PropertyStatus } from '../property/property-status';
import { ProposalStatus } from './proposal-status';

const transitions: Record<ProposalStatus, readonly ProposalStatus[]> = {
  [ProposalStatus.NOVA]: [ProposalStatus.ANALISE_CREDITO, ProposalStatus.CANCELADA, ProposalStatus.REPROVADA],
  [ProposalStatus.ANALISE_CREDITO]: [
    ProposalStatus.CONTRATO_EMITIDO, ProposalStatus.CANCELADA, ProposalStatus.REPROVADA,
  ],
  [ProposalStatus.CONTRATO_EMITIDO]: [ProposalStatus.ASSINADO, ProposalStatus.CANCELADA, ProposalStatus.REPROVADA],
  [ProposalStatus.ASSINADO]: [ProposalStatus.ATIVO, ProposalStatus.CANCELADA, ProposalStatus.REPROVADA],
  [ProposalStatus.ATIVO]: [],
  [ProposalStatus.CANCELADA]: [],
  [ProposalStatus.REPROVADA]: [],
};

const propertyEffects: Partial<Record<ProposalStatus, PropertyStatus>> = {
  [ProposalStatus.ATIVO]: PropertyStatus.ALUGADO,
  [ProposalStatus.CANCELADA]: PropertyStatus.DISPONIVEL,
  [ProposalStatus.REPROVADA]: PropertyStatus.DISPONIVEL,
};

export function canTransition(from: ProposalStatus, to: ProposalStatus): boolean {
  return transitions[from].includes(to);
}

export function propertyStatusFor(status: ProposalStatus): PropertyStatus | undefined {
  return propertyEffects[status];
}
