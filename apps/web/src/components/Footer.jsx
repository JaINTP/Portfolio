import React, { useEffect, useMemo, useState } from 'react';
import { Mail } from 'lucide-react';
import { Github, Linkedin, Twitter } from './SocialIcons';
import { api } from '../lib/api';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const data = await api.getAbout();
        if (!cancelled) {
          setProfile(data);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const socialLinks = useMemo(() => {
    if (!profile?.social && !profile?.email) {
      return [];
    }

    const links = [];
    if (profile?.social?.github) {
      links.push({ icon: Github, href: profile.social.github, label: 'GitHub' });
    }
    if (profile?.social?.linkedin) {
      links.push({ icon: Linkedin, href: profile.social.linkedin, label: 'LinkedIn' });
    }
    if (profile?.social?.twitter) {
      links.push({ icon: Twitter, href: profile.social.twitter, label: 'Twitter' });
    }
    if (profile?.email) {
      links.push({ icon: Mail, href: `mailto:${profile.email}`, label: 'Email' });
    }
    return links;
  }, [profile]);

  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Portfolio</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Software developer, security researcher, and science enthusiast building secure and innovative solutions.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/projects" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">
                  Projects
                </a>
              </li>
              <li>
                <a href="/blog" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">
                  About
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Connect</h3>
            <div className="flex space-x-4">
              {socialLinks.length > 0 ? (
                socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-cyan-400 transition-colors p-2 hover:bg-white/5 rounded-lg"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))
              ) : (
                <span className="text-gray-500 text-sm">
                  Social links coming soon.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-center text-gray-500 text-sm">
            © {currentYear} Portfolio. Built with React & FastAPI.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
