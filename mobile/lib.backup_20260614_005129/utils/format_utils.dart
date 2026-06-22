class FormatUtils {
  // Formatadores por país
  static final Map<String, NumberFormatConfig> _formats = {
    'MZ': NumberFormatConfig(
      name: 'Moçambique',
      decimalSeparator: ',',
      thousandSeparator: '.',
      currencySymbol: 'MT',
      currencyPosition: 'suffix', // 1.000,00 MT
    ),
    'PT': NumberFormatConfig(
      name: 'Portugal',
      decimalSeparator: ',',
      thousandSeparator: '.',
      currencySymbol: '€',
      currencyPosition: 'prefix', // €1.000,00
    ),
    'BR': NumberFormatConfig(
      name: 'Brasil',
      decimalSeparator: ',',
      thousandSeparator: '.',
      currencySymbol: 'R\$',
      currencyPosition: 'prefix', // R$ 1.000,00
    ),
    'US': NumberFormatConfig(
      name: 'Estados Unidos',
      decimalSeparator: '.',
      thousandSeparator: ',',
      currencySymbol: 'USD',
      currencyPosition: 'prefix', // $1,000.00
    ),
    'GB': NumberFormatConfig(
      name: 'Reino Unido',
      decimalSeparator: '.',
      thousandSeparator: ',',
      currencySymbol: '£',
      currencyPosition: 'prefix', // £1,000.00
    ),
    'EU': NumberFormatConfig(
      name: 'Europa',
      decimalSeparator: ',',
      thousandSeparator: '.',
      currencySymbol: '€',
      currencyPosition: 'prefix', // €1.000,00
    ),
  };

  // Formatar valor com base no país
  static String formatMoney(double value, {String countryCode = 'MZ'}) {
    final config = _formats[countryCode.toUpperCase()] ?? _formats['MZ']!;
    return config.format(value);
  }

  // Formatar valor sem símbolo (apenas número)
  static String formatNumber(double value, {String countryCode = 'MZ'}) {
    final config = _formats[countryCode.toUpperCase()] ?? _formats['MZ']!;
    return config.formatNumber(value);
  }

  // Converter string formatada para double
  static double parseMoney(String formattedValue, {String countryCode = 'MZ'}) {
    final config = _formats[countryCode.toUpperCase()] ?? _formats['MZ']!;
    
    String cleaned = formattedValue;
    
    // Remover símbolo da moeda
    if (cleaned.contains(config.currencySymbol)) {
      cleaned = cleaned.replaceAll(config.currencySymbol, '');
    }
    
    // Remover espaços
    cleaned = cleaned.trim();
    
    // Substituir separadores
    if (config.decimalSeparator == ',') {
      cleaned = cleaned.replaceAll('.', ''); // Remove milhares
      cleaned = cleaned.replaceAll(',', '.'); // Vírgula vira ponto decimal
    } else {
      cleaned = cleaned.replaceAll(',', ''); // Remove milhares
    }
    
    return double.tryParse(cleaned) ?? 0;
  }

  // Obter configuração de um país
  static NumberFormatConfig? getConfig(String countryCode) {
    return _formats[countryCode.toUpperCase()];
  }

  // Listar países suportados
  static List<String> getSupportedCountries() {
    return _formats.keys.toList();
  }
}

class NumberFormatConfig {
  final String name;
  final String decimalSeparator;
  final String thousandSeparator;
  final String currencySymbol;
  final String currencyPosition; // 'prefix' ou 'suffix'

  NumberFormatConfig({
    required this.name,
    required this.decimalSeparator,
    required this.thousandSeparator,
    required this.currencySymbol,
    required this.currencyPosition,
  });

  String format(double value) {
    // Formatar número
    String numberStr = formatNumber(value);
    
    // Adicionar símbolo da moeda na posição correta
    if (currencyPosition == 'prefix') {
      return '$currencySymbol$numberStr';
    } else {
      return '$numberStr $currencySymbol';
    }
  }

  String formatNumber(double value) {
    // Separar parte inteira e decimal
    String valueStr = value.toStringAsFixed(2);
    List<String> parts = valueStr.split('.');
    
    String integerPart = parts[0];
    String decimalPart = parts[1];
    
    // Adicionar separador de milhares
    String formattedInteger = '';
    for (int i = 0; i < integerPart.length; i++) {
      if (i > 0 && (integerPart.length - i) % 3 == 0) {
        formattedInteger += thousandSeparator;
      }
      formattedInteger += integerPart[i];
    }
    
    return '$formattedInteger$decimalSeparator$decimalPart';
  }
}
