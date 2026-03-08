import { Header } from "@/components/Header";
import { AccessForm } from "@/components/AccessForm";
import { motion } from "framer-motion";

const AccessData = () => {
  return (
    <div className="min-h-screen warm-gradient">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg"
        >
          <div className="glass-card p-6 md:p-8">
            <AccessForm />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AccessData;
