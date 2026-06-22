class LoginResult {
  final bool success;
  final bool requiresTwoFactor;
  final String? kpId;
  final String? error;

  const LoginResult({
    required this.success,
    this.requiresTwoFactor = false,
    this.kpId,
    this.error,
  });

  static LoginResult failure([String? error]) =>
      LoginResult(success: false, error: error);
}
