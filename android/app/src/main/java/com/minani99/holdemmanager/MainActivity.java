package com.minani99.holdemmanager;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONArray;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

/**
 * 홀덤 매니저 웹 앱(assets/www)을 WebView 하나로 보여줘요.
 *
 * 파일은 https://appassets.androidplatform.net/ 주소로 앱 안에서 바로 제공하므로 인터넷 없이 동작하고,
 * localStorage 기록도 이 주소 기준으로 기기에 남아요. 웹에서 쓰던 진동 · 화면 유지 · 전체 화면은
 * window.HoldemNative 로 대신 제공해요 (js/app.js 참고).
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";

    private FrameLayout root;
    private WebView web;
    private boolean immersive = true;
    private OnBackInvokedCallback backCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#090C11"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#090C11"));
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);

        web.setWebViewClient(new LocalAssetClient(getAssets()));
        web.addJavascriptInterface(new Bridge(), "HoldemNative");

        // Android 15+ 는 화면을 시스템 바 뒤까지 그려요. 바가 보일 때 내용이 가려지지 않게 여백을 줘요.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(i.left, i.top, i.right, i.bottom);
                return WindowInsets.CONSUMED;
            });
        }

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl(START_URL);
        }

        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
        applyImmersive();
    }

    // ------------------------------------------------------------------ 뒤로 가기
    private void handleBack() {
        // 열린 창 · 레이즈 패널 · 타이머 전체 화면이 있으면 먼저 닫고, 없으면 앱을 닫아요 (기록은 자동 저장돼 있어요).
        web.evaluateJavascript("(window.__holdemBack && window.__holdemBack()) === true", value -> {
            if (!"true".equals(value)) finish();
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // Android 12 이하에서만 불려요. 13 이상은 OnBackInvokedCallback 이 처리해요.
        handleBack();
    }

    // ------------------------------------------------------------------ 전체 화면
    private void applyImmersive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c == null) return;
            if (immersive) {
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                c.hide(WindowInsets.Type.systemBars());
            } else {
                c.show(WindowInsets.Type.systemBars());
            }
        } else {
            int flags = immersive
                    ? View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    : View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && immersive) applyImmersive();
    }

    // ------------------------------------------------------------------ 생명주기
    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        root.removeView(web);
        web.destroy();
        super.onDestroy();
    }

    // ------------------------------------------------------------------ JS 브리지
    private final class Bridge {
        @JavascriptInterface
        public void vibrate(String patternJson) {
            long[] pattern;
            try {
                JSONArray a = new JSONArray(patternJson);
                pattern = new long[a.length()];
                for (int i = 0; i < a.length(); i++) pattern[i] = Math.max(0, a.optLong(i));
            } catch (Exception e) {
                return;
            }
            if (pattern.length == 0) return;
            Vibrator v;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = getSystemService(VibratorManager.class);
                v = vm == null ? null : vm.getDefaultVibrator();
            } else {
                v = getSystemService(Vibrator.class);
            }
            if (v == null || !v.hasVibrator()) return;
            if (pattern.length == 1) {
                if (pattern[0] > 0) v.vibrate(VibrationEffect.createOneShot(pattern[0], VibrationEffect.DEFAULT_AMPLITUDE));
                return;
            }
            // navigator.vibrate([진동, 쉼, 진동…]) → Android 파형은 [대기, 진동, 쉼, …] 이라 앞에 0을 붙여요.
            long[] timings = new long[pattern.length + 1];
            System.arraycopy(pattern, 0, timings, 1, pattern.length);
            v.vibrate(VibrationEffect.createWaveform(timings, -1));
        }

        @JavascriptInterface
        public void keepAwake(boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void toggleFullscreen() {
            runOnUiThread(() -> {
                immersive = !immersive;
                applyImmersive();
            });
        }
    }

    // ------------------------------------------------------------------ 앱 안 파일 제공
    private final class LocalAssetClient extends WebViewClient {
        private final AssetManager assets;

        LocalAssetClient(AssetManager assets) {
            this.assets = assets;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost())) return null;
            String path = uri.getPath();
            if (path == null || path.isEmpty() || "/".equals(path)) path = "/index.html";
            if (path.contains("..")) return notFound();
            String mime = mimeOf(path);
            try {
                InputStream in = assets.open("www" + path);
                String enc = mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json")
                        || mime.endsWith("svg+xml") ? "utf-8" : null;
                return new WebResourceResponse(mime, enc, in);
            } catch (IOException e) {
                return notFound();
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (HOST.equals(uri.getHost())) return false;
            // 앱 밖 링크는 브라우저로 열어요.
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) {
                // 열 수 있는 앱이 없으면 무시
            }
            return true;
        }

        private WebResourceResponse notFound() {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                    Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
        }

        private String mimeOf(String path) {
            String p = path.toLowerCase();
            if (p.endsWith(".html")) return "text/html";
            if (p.endsWith(".css")) return "text/css";
            if (p.endsWith(".js")) return "application/javascript";
            if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
            if (p.endsWith(".svg")) return "image/svg+xml";
            if (p.endsWith(".png")) return "image/png";
            if (p.endsWith(".woff2")) return "font/woff2";
            return "application/octet-stream";
        }
    }
}
