export enum ProposalStatus {
  NOVA = 'NOVA',
  ANALISE_CREDITO = 'ANALISE_CREDITO',
  CONTRATO_EMITIDO = 'CONTRATO_EMITIDO',
  ASSINADO = 'ASSINADO',
  ATIVO = 'ATIVO',
  CANCELADA = 'CANCELADA',
  REPROVADA = 'REPROVADA',
}

export enum ProposalEventType {
  STATUS_CHANGED = 'ProposalStatusChanged',
}

export const proposalStatuses = Object.values(ProposalStatus);
