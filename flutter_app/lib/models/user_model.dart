enum UserRole {
  super_admin,
  admin,
  user,
}

class UserModel {
  final String id;
  final String email;
  final String fullName;
  final UserRole role;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'].toString(),
      email: json['email'],
      fullName: json['full_name'],
      role: UserRole.values.firstWhere(
        (e) => e.name == json['role'],
        orElse: () => UserRole.user,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'role': role.name,
    };
  }
}
