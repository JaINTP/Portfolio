import React from 'react';
import ResponsiveSection from '../components/layout/ResponsiveSection';

const Terms = () => {
    const lastUpdated = "December 21, 2025";

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
            <ResponsiveSection as="section" width="narrow" className="py-0">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 sm:p-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">Terms of Service</h1>
                    <p className="text-gray-400 mb-8">Last Updated: {lastUpdated}</p>

                    <div className="prose prose-invert max-w-none space-y-8 text-gray-300">
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing and using this portfolio website, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the site.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. Intellectual Property</h2>
                            <p>
                                All content on this site, including text, code, projects, and images, is the intellectual property of the owner unless otherwise stated. You may not reproduce or distribute any content without explicit permission.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. User Conduct</h2>
                            <p>
                                When using the commenting system, you agree not to post any content that is:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Unlawful, harmful, or threatening</li>
                                <li>Defamatory or invasive of privacy</li>
                                <li>Infringing on intellectual property rights</li>
                                <li>Spam or commercial solicitation</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. Disclaimer</h2>
                            <p>
                                The information provided on this site is for general informational purposes only. While I strive for accuracy, I make no representations or warranties of any kind about the completeness or reliability of the content.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. Modifications</h2>
                            <p>
                                I reserve the right to modify these terms at any time. Your continued use of the site following any changes constitutes your acceptance of the new terms.
                            </p>
                        </section>
                    </div>
                </div>
            </ResponsiveSection>
        </div>
    );
};

export default Terms;
