import React from 'react';
import ResponsiveSection from '../components/layout/ResponsiveSection';

const Privacy = () => {
    const lastUpdated = "December 21, 2025";

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
            <ResponsiveSection as="section" width="narrow" className="py-0">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 sm:p-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">Privacy Policy</h1>
                    <p className="text-gray-400 mb-8">Last Updated: {lastUpdated}</p>

                    <div className="prose prose-invert max-w-none space-y-8 text-gray-300">
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. Information Collection</h2>
                            <p>
                                We collect information when you interact with this site, specifically:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>SSO Data:</strong> When you log in via Google, GitHub, X, or Meta, we receive your name, email, and profile picture.</li>
                                <li><strong>Comments:</strong> We store the content of any comments you post on the blog.</li>
                                <li><strong>Usage Data:</strong> We may collect anonymous data about how you interact with the site to improve the user experience.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. Use of Information</h2>
                            <p>
                                Your information is used to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Provide and maintain the service</li>
                                <li>Identify you as the author of your comments</li>
                                <li>Ensure the security and integrity of the site</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. Data Security</h2>
                            <p>
                                We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. Third-Party Services</h2>
                            <p>
                                We use third-party SSO providers. Their use of your data is governed by their respective privacy policies. We are not responsible for the practices of third-party platforms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. Your Rights</h2>
                            <p>
                                Depending on your location, you may have rights regarding your personal data, including the right to access, correct, or delete your information. Contact me if you wish to exercise these rights.
                            </p>
                        </section>
                    </div>
                </div>
            </ResponsiveSection>
        </div>
    );
};

export default Privacy;
