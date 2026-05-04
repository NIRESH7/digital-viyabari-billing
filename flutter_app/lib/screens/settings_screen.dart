import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _gstController = TextEditingController();
  final _mobileController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('company_details');
    if (saved != null) {
      final details = json.decode(saved);
      setState(() {
        _nameController.text = details['name'] ?? '';
        _addressController.text = details['address'] ?? '';
        _gstController.text = details['gst'] ?? '';
        _mobileController.text = details['mobile'] ?? '';
      });
    }
  }

  Future<void> _handleSave() async {
    final details = {
      'name': _nameController.text,
      'address': _addressController.text,
      'gst': _gstController.text,
      'mobile': _mobileController.text,
    };
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('company_details', json.encode(details));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('COMPANY DETAILS SAVED.')));
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('COMPANY DETAILS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildField('COMPANY NAME', _nameController),
              const SizedBox(height: 20),
              _buildField('ADDRESS', _addressController, maxLines: 3),
              const SizedBox(height: 20),
              _buildField('GST NUMBER', _gstController),
              const SizedBox(height: 20),
              _buildField('MOBILE NUMBER', _mobileController),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _handleSave,
                  child: const Text('SAVE DETAILS'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, {int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLines: maxLines,
          decoration: const InputDecoration(contentPadding: EdgeInsets.all(12)),
        ),
      ],
    );
  }
}
