import { motion } from "framer-motion";

import { Header } from "@/components/Header";
import { MeProfileView } from "@/components/me/MeProfileView";
import { MeSettingsSection } from "@/components/me/MeSettingsSection";
import { MeEditForm } from "@/components/me/MeEditForm";
import { useMyInfo } from "@/hooks/useMyInfo";

/**
 * /me — the single view/edit surface for the verified end-user.
 * View mode mirrors the admin ContactDetailSheet layout.
 */
const MyInfo = () => {
  const m = useMyInfo();

  if (!m.session || !m.contact) return null;

  return (
    <div className="flex min-h-app flex-col bg-background">
      <Header />
      <main id="main-content" className="relative flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto w-full max-w-xl"
        >
          {m.editing ? (
            <MeEditForm
              form={m.form}
              setForm={m.setForm}
              phones={m.phones}
              setPhones={m.setPhones}
              saving={m.saving}
              fid={m.fid}
              onCancel={m.cancelEdit}
              onSave={m.handleSave}
            />
          ) : (
            <>
              <MeProfileView
                contact={m.contact}
                isOtpAuth={!!m.isOtpAuth}
                hasChat={m.hasChat}
                canBootstrapChat={!!m.canBootstrapChat}
                openingChat={m.openingChat}
                onEdit={m.startEdit}
                onStartChat={m.startChat}
              />
              <MeSettingsSection
                isOtpAuth={!!m.isOtpAuth}
                fid={m.fid}
                sessionsOpen={m.sessionsOpen}
                setSessionsOpen={m.setSessionsOpen}
                secretOpen={m.secretOpen}
                setSecretOpen={m.setSecretOpen}
                closeSecretPanel={m.closeSecretPanel}
                newSecret={m.newSecret}
                setNewSecret={m.setNewSecret}
                showSecret={m.showSecret}
                setShowSecret={m.setShowSecret}
                settingSecret={m.settingSecret}
                ackDanger={m.ackDanger}
                setAckDanger={m.setAckDanger}
                onSetSecret={m.handleSetSecret}
                onLogout={m.handleLogout}
              />
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default MyInfo;
