import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:share_plus/share_plus.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io' as io;

class PdfService {
  static Future<void> saveAndOpen(Uint8List bytes, String fileName) async {
    if (kIsWeb) {
      // Handled in screen via data URL
      return;
    }
    
    final directory = await getApplicationDocumentsDirectory();
    final file = io.File('${directory.path}/$fileName');
    await file.writeAsBytes(bytes);
    await OpenFilex.open(file.path);
  }

  static Future<void> share(Uint8List bytes, String fileName, String text) async {
    if (kIsWeb) return;
    
    final directory = await getTemporaryDirectory();
    final file = io.File('${directory.path}/$fileName');
    await file.writeAsBytes(bytes);
    await Share.shareXFiles([XFile(file.path)], text: text);
  }
}
