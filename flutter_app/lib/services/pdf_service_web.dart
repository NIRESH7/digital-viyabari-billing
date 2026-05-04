import 'dart:typed_data';

class PdfService {
  static Future<void> saveAndOpen(Uint8List bytes, String fileName) async {
    // Logic moved to screen for web-specific data URL launch
  }

  static Future<void> share(Uint8List bytes, String fileName, String text) async {
    // Not supported on web
  }
}
