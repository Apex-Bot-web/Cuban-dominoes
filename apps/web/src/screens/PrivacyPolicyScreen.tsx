interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

export function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
  return (
    <div className="h-full flex flex-col felt-texture">
      <div className="flex items-center gap-3 px-4 py-3 bg-felt-dark/80 border-b border-white/10 pt-safe shrink-0">
        <button
          onClick={onBack}
          className="text-white/40 active:text-white text-sm font-bold transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-white font-black text-lg flex-1 text-center">Privacy Policy</h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 max-w-xl mx-auto w-full">
        <div className="flex flex-col gap-6 text-white/70 text-sm leading-relaxed">

          <div>
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-1">Effective date</p>
            <p>June 2026</p>
          </div>

          <p>
            Cuban Domino ("the App") is a free online domino game. This policy explains what
            information we collect, how we use it, and your rights. We keep it short because we
            genuinely don't collect much.
          </p>

          <Section title="What we collect">
            <Item label="Anonymous player ID">
              When you first open the App, your browser generates a random ID (a UUID) and stores
              it in your device's local storage. This ID is never linked to your name, email, or
              any other personal data outside the App.
            </Item>
            <Item label="Display name">
              The name you choose to show to other players (e.g. "Carlos"). This is the only
              human-readable identifier we store on our server.
            </Item>
            <Item label="Game statistics">
              Match results, scores, hands played, and win/loss records — tied to your anonymous
              player ID. We use this to display your personal stats and the leaderboard.
            </Item>
            <Item label="Friends list">
              If you use the Friends feature, we store the pair of anonymous player IDs for each
              friendship. No contact information is shared or required.
            </Item>
            <Item label="Online presence">
              A timestamp of your last activity, used only to show green "online" dots to your
              friends. This resets on inactivity and is never shared outside the App.
            </Item>
          </Section>

          <Section title="What we do NOT collect">
            <ul className="flex flex-col gap-1.5 list-none">
              {[
                'Email address, phone number, or any contact information',
                'Real name, location, or government-issued ID',
                'Payment or financial data — the App is free',
                'Device identifiers, advertising IDs, or fingerprints',
                'IP addresses stored long-term or linked to game data',
                'Browsing history or activity outside the App',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-red-400/60 shrink-0 mt-0.5">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="How we use your data">
            <p>
              We use your data only to operate the App: displaying your stats, running the
              leaderboard, letting friends see your online status, and connecting you to
              multiplayer rooms. We do not sell, rent, or share your data with third parties
              for marketing or advertising purposes.
            </p>
          </Section>

          <Section title="Data storage and security">
            <p>
              Game data is stored on a server hosted by Railway (railway.app) in the United
              States. Your anonymous player ID and display name are also cached in your browser's
              local storage. We use HTTPS for all data in transit. Because your identity is
              anonymous by design, a data breach would not expose personally identifiable
              information.
            </p>
          </Section>

          <Section title="Data retention">
            <p>
              We keep your game data for as long as you use the App. You can effectively delete
              your account at any time by clearing your browser's local storage — this removes
              your player ID and the App can no longer identify you. Server-side records
              associated with your old ID become orphaned and are not linked to any new sessions.
            </p>
            <p className="mt-3">
              To request manual deletion of your server-side data, contact us at the email below
              with the display name you used. We will remove it within 30 days.
            </p>
          </Section>

          <Section title="Children">
            <p>
              The App is intended for users aged 13 and older. We do not knowingly collect data
              from children under 13. If you believe a child under 13 has used the App, please
              contact us and we will delete the associated records.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              If we make material changes we will update the effective date at the top of this
              page. Continued use of the App after changes constitutes acceptance of the revised
              policy.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy?{' '}
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

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-white/90 font-bold">{label}</span>
      <span>{children}</span>
    </div>
  );
}
