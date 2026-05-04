import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../services/api_service.dart';
import '../services/pdf_service.dart';
import '../utils/app_theme.dart';

class CreateInvoiceScreen extends StatefulWidget {
  const CreateInvoiceScreen({super.key});

  @override
  State<CreateInvoiceScreen> createState() => _CreateInvoiceScreenState();
}

class _CreateInvoiceScreenState extends State<CreateInvoiceScreen> {
  final _apiService = ApiService();
  List<dynamic> _clients = [];
  List<dynamic> _products = [];

  String? _selectedClientId;
  String _invoiceNumber = 'INV-${DateTime.now().millisecondsSinceEpoch.toString().substring(9)}';
  DateTime _date = DateTime.now();
  double _discount = 0;
  double _paidAmount = 0;
  String _paymentMode = 'CASH';

  List<Map<String, dynamic>> _items = [
    {'product_id': '', 'product_name': '', 'quantity': 1.0, 'price': 0.0, 'gst_percent': 18.0}
  ];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      final responses = await Future.wait([
        _apiService.get('/clients'),
        _apiService.get('/products'),
      ]);
      if (responses[0].statusCode == 200 && responses[1].statusCode == 200) {
        setState(() {
          _clients = json.decode(responses[0].body);
          _products = json.decode(responses[1].body);
        });
      }
    } catch (e) {
      print('Error fetching data: $e');
    }
  }

  void _updateItem(int index, String field, dynamic value) {
    setState(() {
      if (field == 'product_id') {
        final prod = _products.firstWhere((p) => p['id'].toString() == value.toString(), orElse: () => null);
        if (prod != null) {
          _items[index] = {
            'product_id': value,
            'product_name': prod['name'],
            'price': prod['price'].toDouble(),
            'gst_percent': prod['gst_percent'].toDouble(),
            'quantity': _items[index]['quantity'] ?? 1.0,
          };
        }
      } else {
        _items[index][field] = value;
      }
    });
  }

  Map<String, double> _calculate() {
    double subTotal = 0;
    double gstTotal = 0;
    for (var item in _items) {
      final p = (item['price'] as num?)?.toDouble() ?? 0.0;
      final q = (item['quantity'] as num?)?.toDouble() ?? 0.0;
      final g = (item['gst_percent'] as num?)?.toDouble() ?? 18.0;
      subTotal += p * q;
      gstTotal += (p * q * g) / 100;
    }
    final total = subTotal + gstTotal - _discount;
    return {'subTotal': subTotal, 'gstTotal': gstTotal, 'total': total};
  }

  bool _isSaving = false;

  Future<void> _handleSubmit() async {
    if (_selectedClientId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('SELECT CUSTOMER')));
      return;
    }

    setState(() => _isSaving = true);
    final totals = _calculate();
    final body = {
      'client_id': _selectedClientId!,
      'invoice_number': _invoiceNumber,
      'date': _date.toIso8601String().split('T')[0],
      'discount': _discount,
      'paid_amount': _paidAmount,
      'status': _paidAmount >= totals['total']! ? 'PAID' : 'UNPAID',
      'payment_mode': _paymentMode,
      'total_amount': totals['total'],
      'items': _items.map((i) => {
        'product_id': i['product_id'] != '' ? i['product_id'].toString() : null,
        'product_name': i['product_name'],
        'quantity': i['quantity'],
        'price': i['price'],
        'gst_percent': i['gst_percent'],
      }).toList(),
    };

    try {
      final response = await _apiService.post('/invoices', body);
      if (response.statusCode == 200) {
        final savedInvoice = json.decode(response.body);
        final invoiceId = savedInvoice['id'];
        
        // Auto-Generate PDF
        final pdfRes = await _apiService.get('/invoices/$invoiceId/pdf');
        if (pdfRes.statusCode == 200) {
          if (kIsWeb) {
            final content = base64Encode(pdfRes.bodyBytes);
            final url = 'data:application/pdf;base64,$content';
            final anchor = Uri.parse(url);
            if (await canLaunchUrl(anchor)) {
              await launchUrl(anchor);
            }
          } else {
            await PdfService.saveAndOpen(pdfRes.bodyBytes, 'INV_$_invoiceNumber.pdf');
          }
        }
        
        if (mounted) Navigator.pop(context, true);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('ERROR SAVING INVOICE')));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totals = _calculate();
    final currencyFormat = NumberFormat.currency(symbol: '₹', locale: 'en_IN');

    return Scaffold(
      appBar: AppBar(title: const Text('BILLING', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildCustomerSection(),
            const SizedBox(height: 24),
            _buildProductsSection(),
            const SizedBox(height: 24),
            _buildSummarySection(totals, currencyFormat),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _handleSubmit,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(20)),
                child: const Text('SAVE & GENERATE', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomerSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedClientId,
                  decoration: const InputDecoration(hintText: 'SELECT CUSTOMER'),
                  items: _clients.map((c) => DropdownMenuItem(value: c['id'].toString(), child: Text("${c['name']} (${c['mobile']})"))).toList(),
                  onChanged: (val) => setState(() => _selectedClientId = val),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(onPressed: () {}, icon: const Icon(Icons.add_circle_outline, color: AppColors.primary)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProductsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('PRODUCTS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.textMuted)),
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _items.length,
            separatorBuilder: (_, __) => const Divider(),
            itemBuilder: (context, index) {
              final item = _items[index];
              return Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: DropdownButtonFormField<String>(
                          value: item['product_id'] == '' ? null : item['product_id'].toString(),
                          decoration: const InputDecoration(hintText: 'PRODUCT', contentPadding: EdgeInsets.symmetric(horizontal: 8)),
                          items: _products.map((p) => DropdownMenuItem(value: p['id'].toString(), child: Text(p['name'], style: const TextStyle(fontSize: 12)))).toList(),
                          onChanged: (val) => _updateItem(index, 'product_id', val),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 1,
                        child: TextField(
                          decoration: const InputDecoration(hintText: 'QTY', contentPadding: EdgeInsets.symmetric(horizontal: 8)),
                          keyboardType: TextInputType.number,
                          onChanged: (val) => _updateItem(index, 'quantity', double.tryParse(val) ?? 0),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: () => setState(() => _items.removeAt(index)),
                        icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: () => setState(() => _items.add({'product_id': '', 'product_name': '', 'quantity': 1.0, 'price': 0.0, 'gst_percent': 18.0})),
            icon: const Icon(Icons.add, size: 16),
            label: const Text('ADD ITEM', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildSummarySection(Map<String, double> totals, NumberFormat currencyFormat) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('PAID AMOUNT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    TextField(
                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12)),
                      keyboardType: TextInputType.number,
                      onChanged: (val) => setState(() => _paidAmount = double.tryParse(val) ?? 0),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('MODE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    DropdownButtonFormField<String>(
                      value: _paymentMode,
                      items: ['CASH', 'ONLINE'].map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                      onChanged: (val) => setState(() => _paymentMode = val!),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 32, thickness: 2, color: Colors.black),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('TOTAL', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
              Text(currencyFormat.format(totals['total']), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('BALANCE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
              Text(currencyFormat.format(totals['total']! - _paidAmount), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
            ],
          ),
        ],
      ),
    );
  }
}
