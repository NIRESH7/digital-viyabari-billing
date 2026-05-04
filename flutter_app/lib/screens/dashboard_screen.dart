import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../utils/app_theme.dart';

class DashboardScreen extends StatefulWidget {
  final UserModel user;
  const DashboardScreen({super.key, required this.user});

  @override
  State<DashboardScreen> createState() => DashboardScreenState();
}

class DashboardScreenState extends State<DashboardScreen> {
  final _apiService = ApiService();
  Map<String, dynamic>? _stats;
  bool _isLoading = true;
  String? _selectedUserId;
  Map<String, dynamic>? _userStats;

  @override
  void initState() {
    super.initState();
    fetchMainStats();
  }

  Future<void> fetchMainStats() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/dashboard/stats');
      if (response.statusCode == 200) {
        setState(() {
          _stats = json.decode(response.body);
        });
      }
    } catch (e) {
      print('Error fetching stats: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchUserDetails(String userId) async {
    try {
      final response = await _apiService.get('/dashboard/stats?target_user_id=$userId');
      if (response.statusCode == 200) {
        setState(() {
          _userStats = json.decode(response.body);
          _selectedUserId = userId;
        });
      }
    } catch (e) {
      print('Error fetching user stats: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: Text('LOADING DATA...'));
    }

    final currencyFormat = NumberFormat.currency(symbol: '₹', locale: 'en_IN', decimalDigits: 0);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome back, ${widget.user.fullName.split(' ')[0]}',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const Text(
                      "Here's what's happening today.",
                      style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                  ],
                ),
              ),
              if (widget.user.role == UserRole.user)
                ElevatedButton.icon(
                  onPressed: () async {
                    final result = await Navigator.pushNamed(context, '/invoices/new');
                    if (result == true) {
                      fetchMainStats();
                    }
                  },
                  icon: const Icon(Icons.add_circle_outline, size: 18),
                  label: const Text('New'),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                ),
            ],
          ),
          const SizedBox(height: 24),
          _buildStatsGrid(currencyFormat),
          const SizedBox(height: 24),
          if (widget.user.role != UserRole.user) ...[
            _buildManagementTree(),
            if (_selectedUserId != null && _userStats != null) ...[
              const SizedBox(height: 24),
              _buildUserPerformance(currencyFormat),
            ],
          ],
          if (widget.user.role != UserRole.user) ...[
            const SizedBox(height: 24),
            _buildSystemStatus(),
          ],
        ],
      ),
    );
  }

  Widget _buildStatsGrid(NumberFormat currencyFormat) {
    List<Widget> cards = [];
    if (widget.user.role == UserRole.super_admin) {
      cards = [
        _StatsCard(title: 'Revenue', value: currencyFormat.format(_stats?['total_sales'] ?? 0), icon: Icons.trending_up, color: const Color(0xFF6366F1), trend: '+12.5%'),
        _StatsCard(title: 'Admins', value: (_stats?['total_admins'] ?? 0).toString(), icon: Icons.shield_outlined, color: const Color(0xFF8B5CF6)),
        _StatsCard(title: 'Active Users', value: (_stats?['total_users'] ?? 0).toString(), icon: Icons.people_outline, color: const Color(0xFF06B6D4)),
        _StatsCard(
          title: 'Invoices', 
          value: (_stats?['total_invoices'] ?? 0).toString(), 
          icon: Icons.description_outlined, 
          color: const Color(0xFFF59E0B),
        ),
      ];
    } else if (widget.user.role == UserRole.admin) {
      cards = [
        _StatsCard(title: 'My Users', value: (_stats?['active_users'] ?? 0).toString(), icon: Icons.people_outline, color: const Color(0xFF6366F1)),
        _StatsCard(
          title: 'Transactions', 
          value: (_stats?['total_invoices'] ?? 0).toString(), 
          icon: Icons.credit_card, 
          color: const Color(0xFF06B6D4),
        ),
        _StatsCard(title: 'Revenue', value: currencyFormat.format(_stats?['total_sales'] ?? 0), icon: Icons.trending_up, color: const Color(0xFF10B981)),
      ];
    } else {
      cards = [
        _StatsCard(title: 'Sales', value: currencyFormat.format(_stats?['total_sales'] ?? 0), icon: Icons.trending_up, color: const Color(0xFF6366F1), trend: '+8.2%'),
        _StatsCard(title: 'Customers', value: (_stats?['total_clients'] ?? 0).toString(), icon: Icons.people_outline, color: const Color(0xFF06B6D4)),
        _StatsCard(title: 'Inventory', value: (_stats?['total_products'] ?? 0).toString(), icon: Icons.inventory_2_outlined, color: const Color(0xFFF59E0B)),
        _StatsCard(
          title: 'Invoices', 
          value: (_stats?['total_invoices'] ?? 0).toString(), 
          icon: Icons.description_outlined, 
          color: const Color(0xFF8B5CF6),
          onTap: () => Navigator.pushNamed(context, '/invoices', arguments: widget.user),
        ),
      ];
    }

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.1,
      children: cards,
    );
  }

  Widget _buildManagementTree() {
    final users = List<Map<String, dynamic>>.from(_stats?['admins'] ?? _stats?['managed_users'] ?? []);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Management Tree', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              Text('STATS', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          ...users.map((u) => ListTile(
                onTap: () => _fetchUserDetails(u['id']),
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  backgroundColor: AppColors.background,
                  child: const Icon(Icons.person_outline, color: AppColors.primary, size: 18),
                ),
                title: Text(u['full_name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: Text(u['email'], style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                trailing: const Icon(Icons.chevron_right, size: 18, color: AppColors.textMuted),
              )),
        ],
      ),
    );
  }

  Widget _buildUserPerformance(NumberFormat currencyFormat) {
    final invoices = List<Map<String, dynamic>>.from(_userStats?['invoices'] ?? []);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("${_userStats?['target_name']}'s Performance", style: const TextStyle(fontWeight: FontWeight.bold)),
              TextButton(onPressed: () => setState(() => _selectedUserId = null), child: const Text('CLOSE', style: TextStyle(fontSize: 10))),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatItem(label: 'REVENUE', value: currencyFormat.format(_userStats?['total_sales'] ?? 0)),
                _StatItem(label: 'INVOICES', value: (_userStats?['total_invoices'] ?? 0).toString()),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text('RECENT ACTIVITY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
          const SizedBox(height: 8),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: invoices.length > 5 ? 5 : invoices.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final inv = invoices[index];
              return ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(inv['invoice_number'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: Text(DateFormat('dd/MM/yyyy').format(DateTime.parse(inv['created_at'])), style: const TextStyle(fontSize: 11)),
                trailing: Text(currencyFormat.format(inv['total_amount']), style: const TextStyle(fontWeight: FontWeight.bold)),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSystemStatus() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('System Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          SizedBox(height: 16),
          _StatusRow(label: 'API STATUS', value: 'ONLINE', isSuccess: true),
          SizedBox(height: 12),
          _StatusRow(label: 'DATABASE', value: 'STABLE', isSuccess: true),
        ],
      ),
    );
  }
}

class _StatsCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String? trend;
  final VoidCallback? onTap;

  const _StatsCard({required this.title, required this.value, required this.icon, required this.color, this.trend, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                  child: Icon(icon, color: color, size: 18),
                ),
                if (trend != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                    child: Text(trend!, style: const TextStyle(color: Colors.green, fontSize: 8, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, overflow: TextOverflow.ellipsis)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  const _StatItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
      ],
    );
  }
}

class _StatusRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isSuccess;
  const _StatusRow({required this.label, required this.value, required this.isSuccess});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: isSuccess ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(value, style: TextStyle(color: isSuccess ? Colors.green : Colors.red, fontSize: 9, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
