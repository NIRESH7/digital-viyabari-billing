import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';
import 'dart:convert';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  final _apiService = ApiService();
  List<dynamic> _clients = [];
  List<dynamic> _filteredClients = [];
  bool _isLoading = true;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchClients();
    _searchController.addListener(_filterClients);
  }

  Future<void> _fetchClients() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/clients');
      if (response.statusCode == 200) {
        setState(() {
          _clients = json.decode(response.body);
          _filteredClients = _clients;
        });
      }
    } catch (e) {
      print('Error fetching clients: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _filterClients() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredClients = _clients.where((c) {
        return c['name'].toString().toLowerCase().contains(query);
      }).toList();
    });
  }

  void _showAddClientDialog() {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final mobileController = TextEditingController();
    final addressController = TextEditingController();
    final gstController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('NEW CLIENT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(hintText: 'NAME')),
              const SizedBox(height: 16),
              TextField(controller: mobileController, decoration: const InputDecoration(hintText: 'MOBILE'), keyboardType: TextInputType.phone),
              const SizedBox(height: 16),
              TextField(controller: emailController, decoration: const InputDecoration(hintText: 'EMAIL'), keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 16),
              TextField(controller: addressController, decoration: const InputDecoration(hintText: 'ADDRESS')),
              const SizedBox(height: 16),
              TextField(controller: gstController, decoration: const InputDecoration(hintText: 'GSTIN')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () async {
              final body = {
                'name': nameController.text,
                'mobile': mobileController.text,
                'email': emailController.text,
                'address': addressController.text,
                'gst_number': gstController.text,
              };
              final response = await _apiService.post('/clients', body);
              if (response.statusCode == 200) {
                if (mounted) Navigator.pop(context);
                _fetchClients();
              }
            },
            child: const Text('SAVE'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('CUSTOMERS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      hintText: 'SEARCH CLIENTS...',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: ListView.separated(
                        itemCount: _filteredClients.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final client = _filteredClients[index];
                          return ListTile(
                            title: Text(client['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text(client['mobile']),
                            trailing: Text(client['email'] ?? '-', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddClientDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
