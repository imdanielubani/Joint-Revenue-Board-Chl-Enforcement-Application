import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// A recorded answer of the enforcement API (`test/fixtures/api/`), as
/// iteime_backend actually sent it.
Map<String, dynamic> fixture(String name) =>
    jsonDecode(File('test/fixtures/api/$name.json').readAsStringSync())
        as Map<String, dynamic>;

/// What [FakeApi] answers to one request.
class ApiAnswer {
  const ApiAnswer(this.status, [this.body]);

  /// 200 with [fixture] named [name].
  ApiAnswer.fixture(String name, {this.status = 200}) : body = fixture(name);

  /// No answer at all, as with no connection.
  static const ApiAnswer offline = ApiAnswer(-1);

  final int status;
  final Object? body;
}

/// Stands in for the network under a [Dio]: [answer] decides what each
/// request gets, and every request is kept in [requests].
class FakeApi implements HttpClientAdapter {
  FakeApi(this.answer);

  ApiAnswer Function(RequestOptions request) answer;
  final List<RequestOptions> requests = [];

  /// `"POST /verifications"` for each request, in order.
  List<String> get calls => [
    for (final request in requests) '${request.method} ${request.path}',
  ];

  /// A [Dio] for the API that this fake answers.
  Dio dio() =>
      Dio(BaseOptions(baseUrl: 'http://api.test/api/v1'))
        ..httpClientAdapter = this;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final reply = answer(options);
    if (reply.status < 0) {
      throw DioException.connectionError(
        requestOptions: options,
        reason: 'offline',
      );
    }
    return ResponseBody.fromString(
      reply.body == null ? '' : jsonEncode(reply.body),
      reply.status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
