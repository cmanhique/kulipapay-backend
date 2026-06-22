enum AccountType {
  individual,
  merchant,
  agent,
  enterprise,
}

extension AccountTypeExtension on AccountType {
  String get label {
    switch (this) {
      case AccountType.individual:
        return 'Individual';
      case AccountType.merchant:
        return 'Comerciante';
      case AccountType.agent:
        return 'Agente';
      case AccountType.enterprise:
        return 'Empresarial';
    }
  }

  String get apiValue => name.toUpperCase();

  String get description {
    switch (this) {
      case AccountType.individual:
        return 'Conta pessoal para pagamentos e transferências';
      case AccountType.merchant:
        return 'Receba pagamentos através de QR Code e transferências';
      case AccountType.agent:
        return 'Realize depósitos e levantamentos para clientes';
      case AccountType.enterprise:
        return 'Gestão financeira para empresas e organizações';
    }
  }

  bool get isBusiness {
    return this == AccountType.merchant || this == AccountType.enterprise;
  }

  bool get isAgent {
    return this == AccountType.agent;
  }

  bool get isEnterprise {
    return this == AccountType.enterprise;
  }

  bool get canReceiveMerchantPayments {
    return this == AccountType.merchant || this == AccountType.enterprise;
  }

  bool get canPerformCashInCashOut {
    return this == AccountType.agent;
  }
}

enum BusinessType {
  restaurant,
  grocery,
  pharmacy,
  transport,
  fuelStation,
  electronics,
  fashion,
  education,
  healthcare,
  services,
  other,
}

extension BusinessTypeExtension on BusinessType {
  String get label {
    switch (this) {
      case BusinessType.restaurant:
        return 'Restaurante';
      case BusinessType.grocery:
        return 'Mercearia';
      case BusinessType.pharmacy:
        return 'Farmácia';
      case BusinessType.transport:
        return 'Transporte';
      case BusinessType.fuelStation:
        return 'Posto de Combustível';
      case BusinessType.electronics:
        return 'Eletrónica';
      case BusinessType.fashion:
        return 'Moda';
      case BusinessType.education:
        return 'Educação';
      case BusinessType.healthcare:
        return 'Saúde';
      case BusinessType.services:
        return 'Serviços';
      case BusinessType.other:
        return 'Outro';
    }
  }
}