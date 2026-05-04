import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';
import 'dart:convert';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _apiService = ApiService();
  List<dynamic> _products = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchProducts();
  }

  Future<void> _fetchProducts() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/products');
      if (response.statusCode == 200) {
        setState(() {
          _products = json.decode(response.body);
        });
      }
    } catch (e) {
      print('Error fetching products: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showAddProductDialog() {
    final nameController = TextEditingController();
    final priceController = TextEditingController();
    final gstController = TextEditingController(text: '18');
    final stockController = TextEditingController(text: '0');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('NEW PRODUCT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameController, decoration: const InputDecoration(hintText: 'PRODUCT NAME')),
            const SizedBox(height: 16),
            TextField(controller: priceController, decoration: const InputDecoration(hintText: 'PRICE'), keyboardType: TextInputType.number),
            const SizedBox(height: 16),
            TextField(controller: gstController, decoration: const InputDecoration(hintText: 'GST %'), keyboardType: TextInputType.number),
            const SizedBox(height: 16),
            TextField(controller: stockController, decoration: const InputDecoration(hintText: 'STOCK'), keyboardType: TextInputType.number),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () async {
              final body = {
                'name': nameController.text,
                'price': double.parse(priceController.text),
                'gst_percent': double.parse(gstController.text),
                'stock': int.parse(stockController.text),
              };
              final response = await _apiService.post('/products', body);
              if (response.statusCode == 200) {
                if (mounted) Navigator.pop(context);
                _fetchProducts();
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
    final currencyFormat = NumberFormat.currency(symbol: '₹', locale: 'en_IN');

    return Scaffold(
      appBar: AppBar(
        title: const Text('PRODUCTS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(20.0),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: ListView.separated(
                  itemCount: _products.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final product = _products[index];
                    return ListTile(
                      title: Text(product['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text("Stock: ${product['stock']}"),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(currencyFormat.format(product['price']), style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text("GST ${product['gst_percent']}%", style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddProductDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}
