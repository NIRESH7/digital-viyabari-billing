import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/clients_screen.dart';
import 'screens/products_screen.dart';
import 'screens/invoices_screen.dart';
import 'screens/create_invoice_screen.dart';
import 'screens/admin_users_screen.dart';
import 'screens/settings_screen.dart';
import 'services/auth_service.dart';
import 'utils/app_theme.dart';
import 'models/user_model.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Invoicer',
      theme: AppTheme.theme,
      debugShowCheckedModeBanner: false,
      initialRoute: '/check',
      onGenerateRoute: (settings) {
        if (settings.name == '/check') return MaterialPageRoute(builder: (context) => const AuthCheck());
        if (settings.name == '/login') return MaterialPageRoute(builder: (context) => const LoginScreen());
        if (settings.name == '/') return MaterialPageRoute(builder: (context) => const MainLayout());
        
        // Modal / Push screens
        if (settings.name == '/clients') return MaterialPageRoute(builder: (context) => const ClientsScreen());
        if (settings.name == '/products') return MaterialPageRoute(builder: (context) => const ProductsScreen());
        if (settings.name == '/invoices') {
          final user = settings.arguments as UserModel?;
          if (user == null) return MaterialPageRoute(builder: (context) => const AuthCheck());
          return MaterialPageRoute(builder: (context) => InvoicesScreen(user: user));
        }
        if (settings.name == '/invoices/new') return MaterialPageRoute(builder: (context) => const CreateInvoiceScreen());
        if (settings.name == '/admin/users') {
          final user = settings.arguments as UserModel?;
          if (user == null) return MaterialPageRoute(builder: (context) => const AuthCheck());
          return MaterialPageRoute(builder: (context) => AdminUsersScreen(currentUser: user));
        }
        if (settings.name == '/settings') return MaterialPageRoute(builder: (context) => const SettingsScreen());
        
        return null;
      },
    );
  }
}

class AuthCheck extends StatefulWidget {
  const AuthCheck({super.key});

  @override
  State<AuthCheck> createState() => _AuthCheckState();
}

class _AuthCheckState extends State<AuthCheck> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  void _checkAuth() async {
    final authService = AuthService();
    final token = await authService.getToken();
    if (token != null) {
      if (mounted) Navigator.pushReplacementNamed(context, '/');
    } else {
      if (mounted) Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  final _authService = AuthService();
  UserModel? _user;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  void _loadUser() async {
    final user = await _authService.getUser();
    setState(() {
      _user = user;
    });
  }

  void _refreshDashboard() {
    setState(() {}); // This will rebuild DashboardScreen and trigger its initState if we change the key, or we can just call fetchStats if we have a key.
  }

  final GlobalKey<DashboardScreenState> _dashboardKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    if (_user == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    return Scaffold(
      appBar: AppBar(
        title: const Text('INVOICER.', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
        actions: [
          IconButton(
            onPressed: () async {
              await _authService.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              accountName: Text(_user!.fullName),
              accountEmail: Text(_user!.role.name.replaceAll('_', ' ').toUpperCase()),
              currentAccountPicture: CircleAvatar(
                backgroundColor: Colors.white,
                child: Text(_user!.fullName[0], style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary)),
              ),
              decoration: const BoxDecoration(color: AppColors.primary),
            ),
            ListTile(
              leading: const Icon(Icons.dashboard_outlined),
              title: const Text('Overview'),
              onTap: () {
                Navigator.pop(context);
                _dashboardKey.currentState?.fetchMainStats();
              },
            ),
            if (_user!.role == UserRole.user) ...[
              ListTile(
                leading: const Icon(Icons.add_circle_outline),
                title: const Text('New Invoice'),
                onTap: () async {
                  Navigator.pop(context);
                  final result = await Navigator.pushNamed(context, '/invoices/new');
                  if (result == true) {
                    _dashboardKey.currentState?.fetchMainStats();
                  }
                },
              ),
              ListTile(
                leading: const Icon(Icons.people_outline),
                title: const Text('Customers'),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/clients');
                },
              ),
              ListTile(
                leading: const Icon(Icons.inventory_2_outlined),
                title: const Text('Inventory'),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/products');
                },
              ),
              ListTile(
                leading: const Icon(Icons.description_outlined),
                title: const Text('Transactions'),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/invoices', arguments: _user);
                },
              ),
            ],
            const Divider(),
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text('ADMINISTRATION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
            ),
            if (_user!.role == UserRole.super_admin || _user!.role == UserRole.admin)
              ListTile(
                leading: const Icon(Icons.person_add_outlined),
                title: Text(_user!.role == UserRole.super_admin ? "Manage Managers" : "Manage Employees"),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.pushNamed(context, '/admin/users', arguments: _user);
                },
              ),
            ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('Company Profile'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/settings');
              },
            ),
          ],
        ),
      ),
      body: DashboardScreen(key: _dashboardKey, user: _user!),
    );
  }
}
