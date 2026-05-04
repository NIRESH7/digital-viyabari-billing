import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';

class AdminUsersScreen extends StatefulWidget {
  final UserModel currentUser;
  const AdminUsersScreen({super.key, required this.currentUser});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  final _apiService = ApiService();
  List<dynamic> _users = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/admin/users');
      if (response.statusCode == 200) {
        setState(() {
          _users = json.decode(response.body);
        });
      }
    } catch (e) {
      print('Error fetching users: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showAddUserDialog() {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    String role = widget.currentUser.role == UserRole.super_admin ? 'admin' : 'user';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('NEW USER', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(hintText: 'FULL NAME')),
              const SizedBox(height: 16),
              TextField(controller: emailController, decoration: const InputDecoration(hintText: 'EMAIL')),
              const SizedBox(height: 16),
              TextField(controller: passwordController, decoration: const InputDecoration(hintText: 'PASSWORD'), obscureText: true),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: role,
                decoration: const InputDecoration(hintText: 'ROLE'),
                items: widget.currentUser.role == UserRole.super_admin
                    ? [const DropdownMenuItem(value: 'admin', child: Text('ADMIN (MANAGER)'))]
                    : [const DropdownMenuItem(value: 'user', child: Text('USER (EMPLOYEE)'))],
                onChanged: (val) => role = val!,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () async {
              final body = {
                'full_name': nameController.text,
                'email': emailController.text,
                'password': passwordController.text,
                'role': role,
              };
              final response = await _apiService.post('/admin/users', body);
              if (response.statusCode == 200) {
                if (mounted) Navigator.pop(context);
                _fetchUsers();
              }
            },
            child: const Text('SAVE'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleDelete(String userId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove User?'),
        content: const Text('Are you sure you want to remove this user?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('CANCEL')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('REMOVE', style: TextStyle(color: AppColors.error))),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final response = await _apiService.delete('/admin/users/$userId');
        if (response.statusCode == 200) {
          _fetchUsers();
        } else {
          final data = json.decode(response.body);
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(data['detail'] ?? 'Error removing user')));
        }
      } catch (e) {
        print('Error deleting user: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SYSTEM USERS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: _users.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final user = _users[index];
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user['full_name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text(user['email'], style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            const SizedBox(height: 4),
                            Text(user['role'].toString().toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.primary)),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => _handleDelete(user['id']),
                        icon: const Icon(Icons.delete_outline, color: AppColors.error),
                      ),
                    ],
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddUserDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
