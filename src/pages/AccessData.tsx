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
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">আমার তথ্য</h1>
            <p className="text-muted-foreground mt-2 text-sm">ফোন নম্বর বা সিক্রেট কোড দিয়ে আপনার তথ্য দেখুন ও আপডেট করুন</p>
          </div>
          <div className="glass-card p-6 md:p-8">
            <AccessForm />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AccessData;
