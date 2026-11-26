import { RefreshCw, ShieldAlert } from "lucide-react";

export default function CaptchaBox({
  svgDataUrl,
  captchaAnswer,
  setCaptchaAnswer,
  onRefresh,
  loadingCaptcha = false,
  captchaError = ""
}) {
  return (
    <div className="captcha-security-card">
      <div className="captcha-top-row">
        <span className="captcha-label">
          <ShieldAlert size={14} className="text-cyan" /> Human Security CAPTCHA *
        </span>
        <button
          type="button"
          className="captcha-refresh-btn"
          onClick={onRefresh}
          disabled={loadingCaptcha}
          title="Load a new CAPTCHA image"
        >
          <RefreshCw size={13} className={loadingCaptcha ? "spin-icon" : ""} />
          <span>{loadingCaptcha ? "Loading..." : "New Code"}</span>
        </button>
      </div>

      <div className="captcha-challenge-row">
        <div className="captcha-img-wrap">
          {svgDataUrl ? (
            <img
              src={svgDataUrl}
              alt="Security CAPTCHA Challenge"
              className="captcha-svg-img"
              onError={() => {
                if (!loadingCaptcha) onRefresh();
              }}
            />
          ) : captchaError && !loadingCaptcha ? (
            <button
              type="button"
              className="captcha-retry-inline"
              onClick={onRefresh}
              title={captchaError}
            >
              <RefreshCw size={13} />
              <span>Retry CAPTCHA</span>
            </button>
          ) : (
            <div className="captcha-placeholder">
              {loadingCaptcha ? "Waking server & loading..." : "Loading CAPTCHA..."}
            </div>
          )}
        </div>

        <input
          type="text"
          required
          maxLength={8}
          placeholder="Enter 6-char code"
          value={captchaAnswer}
          onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
          className="captcha-text-input"
          autoComplete="off"
        />
      </div>

      {captchaError && !svgDataUrl && !loadingCaptcha && (
        <p className="captcha-error-note">{captchaError}</p>
      )}
    </div>
  );
}
