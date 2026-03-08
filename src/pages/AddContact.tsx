import { Header } from "@/components/Header";
import { ContactForm } from "@/components/ContactForm";
import { motion } from "framer-motion";

const AddContact = () => {
  return (
    <div className="min-h-screen warm-gradient">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              আপনজন ডাইরেক্টরিতে স্বাগতম 💕
            </h1>
            <p className="text-muted-foreground mt-2">
              আপনার তথ্য যোগ করে আমাদের পরিবারের অংশ হোন
            </p>
          </div>
          <div className="glass-card p-6 md:p-8">
            <ContactForm />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AddContact;
