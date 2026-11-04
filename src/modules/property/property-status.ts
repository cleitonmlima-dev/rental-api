export enum PropertyStatus {
  DISPONIVEL = 'DISPONIVEL',
  EM_NEGOCIACAO = 'EM_NEGOCIACAO',
  ALUGADO = 'ALUGADO',
}

export enum PropertyType {
  APARTAMENTO = 'APARTAMENTO',
  CASA = 'CASA',
}

export const propertyStatuses = Object.values(PropertyStatus);
export const propertyTypes = Object.values(PropertyType);
