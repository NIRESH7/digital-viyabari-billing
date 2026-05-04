import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/pdf_service.dart';
import '../utils/app_theme.dart';

class InvoicesScreen extends StatefulWidget {
  final UserModel user;
  const InvoicesScreen({super.key, required this.user});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> with SingleTickerProviderStateMixin {
  final _apiService = ApiService();
  List<dynamic> _invoices = [];
  bool _isLoading = true;
  String _searchTerm = '';
  late TabController _tabController;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchInvoices();
    _tabController = TabController(length: _getTabCount(), vsync: this);
    _tabController.addListener(() => setState(() {}));
  }

  int _getTabCount() {
    if (widget.user.role == UserRole.super_admin) return 4;
    if (widget.user.role == UserRole.admin) return 3;
    return 1;
  }

  Future<void> _fetchInvoices() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/invoices');
      if (response.statusCode == 200) {
        setState(() {
          _invoices = json.decode(response.body);
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleStatusUpdate(String id, String status) async {
    try {
      final response = await _apiService.patch('/invoices/$id/status', {'status': status});
      if (response.statusCode == 200) {
        _fetchInvoices();
      }
    } catch (e) {
      print('Error updating status: $e');
    }
  }

  Future<void> _handleDownload(String id, String number) async {
    try {
      final response = await _apiService.get('/invoices/$id/pdf');
      if (response.statusCode == 200) {
        if (kIsWeb) {
          final content = base64Encode(response.bodyBytes);
          final url = 'data:application/pdf;base64,$content';
          final anchor = Uri.parse(url);
          if (await canLaunchUrl(anchor)) {
            await launchUrl(anchor);
          }
        } else {
          await PdfService.saveAndOpen(response.bodyBytes, 'INV_$number.pdf');
        }
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to download PDF')));
      }
    } catch (e) {
      print('Error downloading invoice: $e');
    }
  }

  Future<void> _handleShare(String id, String number) async {
    try {
      final response = await _apiService.get('/invoices/$id/pdf');
      if (response.statusCode == 200) {
        if (kIsWeb) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sharing not supported on Web. Use Download.')));
           return;
        }
        await PdfService.share(response.bodyBytes, 'INV_$number.pdf', 'Invoice #$number');
      }
    } catch (e) {
      print('Error sharing invoice: $e');
    }
  }

  List<dynamic> _getFilteredInvoices() {
    var list = _invoices.where((i) {
      final searchMatch = i['invoice_number'].toString().toLowerCase().contains(_searchTerm.toLowerCase()) ||
          (i['user_name'] ?? '').toString().toLowerCase().contains(_searchTerm.toLowerCase());
      
      if (!searchMatch) return false;

      final tabIndex = _tabController.index;
      if (widget.user.role == UserRole.user) return true;

      // Super Admin Tabs: 0=All, 1=My, 2=Admins, 3=Users
      if (widget.user.role == UserRole.super_admin) {
        if (tabIndex == 0) return true;
        if (tabIndex == 1) return i['user_id'] == widget.user.id;
        if (tabIndex == 2) return i['user_role'] == 'admin';
        if (tabIndex == 3) return i['user_role'] == 'user';
      }

      // Admin Tabs: 0=All, 1=My, 2=Users
      if (widget.user.role == UserRole.admin) {
        if (tabIndex == 0) return true;
        if (tabIndex == 1) return i['user_id'] == widget.user.id;
        if (tabIndex == 2) return i['user_role'] == 'user';
      }

      return true;
    }).toList();
    
    return list..sort((a, b) => b['id'].toString().compareTo(a['id'].toString()));
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _getFilteredInvoices();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(110),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchTerm = val),
                  decoration: InputDecoration(
                    hintText: 'Search...',
                    prefixIcon: const Icon(Icons.search),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                    filled: true,
                    fillColor: Colors.grey[100],
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
              ),
              TabBar(
                controller: _tabController,
                isScrollable: true,
                tabs: _getTabs(),
              ),
            ],
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : filtered.isEmpty
              ? const Center(child: Text('No transactions found.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    return _buildInvoiceCard(filtered[index]);
                  },
                ),
      floatingActionButton: widget.user.role == UserRole.user
          ? FloatingActionButton(
              onPressed: () async {
                final result = await Navigator.pushNamed(context, '/invoices/new');
                if (result == true) _fetchInvoices();
              },
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  List<Widget> _getTabs() {
    if (widget.user.role == UserRole.super_admin) {
      return const [Tab(text: 'ALL'), Tab(text: 'MY'), Tab(text: 'ADMINS'), Tab(text: 'USERS')];
    }
    if (widget.user.role == UserRole.admin) {
      return const [Tab(text: 'ALL'), Tab(text: 'MY'), Tab(text: 'USERS')];
    }
    return const [Tab(text: 'ALL')];
  }

  Widget _buildInvoiceCard(dynamic inv) {
    final currencyFormat = NumberFormat.currency(symbol: '₹', locale: 'en_IN');
    final isPaid = (inv['status'] ?? '').toString().toUpperCase() == 'PAID';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.description_outlined, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('#${inv['invoice_number']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      Text(DateFormat('dd/MM/yyyy').format(DateTime.parse(inv['date'])), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                    ],
                  ),
                ],
              ),
              GestureDetector(
                onTap: () => _handleStatusUpdate(inv['id'].toString(), isPaid ? 'UNPAID' : 'PAID'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: (isPaid ? AppColors.success : AppColors.error).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    inv['status'].toString().toUpperCase(),
                    style: TextStyle(color: isPaid ? AppColors.success : AppColors.error, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('CREATOR', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                  Text(inv['user_name'] ?? 'System', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('AMOUNT', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                  Text(currencyFormat.format(inv['total_amount']), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.text)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              IconButton(
                onPressed: () => _handleDownload(inv['id'], inv['invoice_number']),
                icon: const Icon(Icons.file_download_outlined, color: AppColors.textMuted, size: 22),
              ),
              IconButton(
                onPressed: () => _handleShare(inv['id'], inv['invoice_number']),
                icon: const Icon(Icons.share_outlined, color: AppColors.textMuted, size: 22),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
