interface TermsScreenProps {
  onBack: () => void;
}

export function TermsScreen({ onBack }: TermsScreenProps) {
  return (
    <div className="h-full flex flex-col felt-texture">
      <div className="flex items-center gap-3 px-4 py-3 bg-felt-dark/80 border-b border-white/10 pt-safe shrink-0">
        <button
          onClick={onBack}
          className="text-white/40 active:text-white text-sm font-bold transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-white font-black text-lg flex-1 text-center">Terms of Service</h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 max-w-xl mx-auto w-full">
        <div className="flex flex-col gap-6 text-white/70 text-sm leading-relaxed">

          <div>
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-1">Effective date</p>
            <p>June 2026</p>
          </div>

          <p>
            These Terms of Service ("Terms") govern your use of Cuban Domino ("the App").
            By playing, you agree to these Terms. If you do not agree, please do not use the App.
          </p>

          <Section title="Eligibility">
            <p>
              You must be at least 13 years old to use the App. By using it, you confirm that
              you meet this requirement. Users under 18 should have parental consent.
            </p>
          </Section>

          <Section title="Your account">
            <p>
              The App uses an anonymous, device-based identity — no email or password is required.
              You are responsible for the device and browser where your player ID is stored. If
              you clear your local storage, your account data cannot be recovered.
            </p>
            <p>
              Your display name must not impersonate others, include offensive language, or violate
              anyone's rights. We may remove names that violate this at any time.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>You agree not to:</p>
            <ul className="flex flex-col gap-1.5 mt-1">
              {[
                'Cheat, exploit bugs, or use automation to gain an unfair advantage',
                'Harass, abuse, or threaten other players through chat or any other feature',
                'Share hate speech, discriminatory content, or sexually explicit material',
                'Attempt to reverse-engineer, decompile, or tamper with the App or its servers',
                'Spam or flood game rooms with disruptive behavior',
                'Use the App for any unlawful purpose',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-orange-400/60 shrink-0 mt-0.5">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Game rules">
            <p>
              The App implements Cuban double-9 domino rules. The game logic is enforced
              server-side and is final. Disputes about game outcomes cannot be appealed — the
              software's result stands.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              We reserve the right to block or remove any player account that violates these
              Terms, without notice. Because accounts are anonymous, blocking is based on the
              player ID stored on your device.
            </p>
          </Section>

          <Section title="Intellectual property">
            <p>
              All game code, design, graphics, and sounds in the App are owned by the developer.
              You may not copy, redistribute, or create derivative works without written
              permission. The domino game rules themselves are in the public domain.
            </p>
          </Section>

          <Section title="Disclaimer of warranties">
            <p>
              The App is provided <strong className="text-white/90">"as is"</strong> without
              warranty of any kind. We do not guarantee that the App will be available at all
              times, free of bugs, or that your game data will be preserved indefinitely. Online
              multiplayer depends on third-party infrastructure that may experience downtime.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the fullest extent permitted by law, the developer is not liable for any
              indirect, incidental, or consequential damages arising from your use of the App,
              including loss of game data, interruption of service, or disputes between players.
              Our total liability to you for any claim is limited to zero dollars, as the App
              is provided free of charge.
            </p>
          </Section>

          <Section title="Changes to these Terms">
            <p>
              We may update these Terms at any time. Material changes will be reflected in the
              effective date above. Continued use of the App after changes means you accept the
              updated Terms.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These Terms are governed by the laws of the United States. Any disputes will be
              resolved through binding arbitration or in a court of competent jurisdiction in
              the United States.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these Terms?{' '}
              <a
                href="mailto:christian@thrivecds.com"
                className="text-green-400 underline underline-offset-2"
              >
                christian@thrivecds.com
              </a>
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-white font-black text-base mb-2">{title}</h2>
      <div className="text-white/70 text-sm leading-relaxed flex flex-col gap-2">{children}</div>
    </div>
  );
}
