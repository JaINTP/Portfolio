import React, { useEffect, useMemo, useState } from 'react';
import { Mail, MapPin, Github, Linkedin, Twitter, Award } from 'lucide-react';
import { api } from '../lib/api';
import { sanitizeHtml } from '../lib/sanitizeHtml';
import { resolveMediaUrl } from '../lib/utils';
import ResponsiveSection from '../components/layout/ResponsiveSection';

const About = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const data = await api.getAbout();
        if (!cancelled) {
          setProfile(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load about profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const safeProfileBio = useMemo(() => sanitizeHtml(profile?.bio ?? ''), [profile?.bio]);
  const safeDogBio = useMemo(() => sanitizeHtml(profile?.dog?.bio ?? ''), [profile?.dog?.bio]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-red-400 text-lg">{error || 'Profile not available yet.'}</p>
        </div>
      </div>
    );
  }

  const { social = {}, dog } = profile;
  const profileImageUrl = resolveMediaUrl(profile.profile_image);
  const dogImageUrl = resolveMediaUrl(dog?.image);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black pt-24 pb-16">
      <ResponsiveSection as="section" className="py-0">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">About Me</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Get to know me and my four-legged debugging partner
          </p>
        </div>

        {/* Main About Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24">
          {/* Personal Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            {profileImageUrl && (
              <div className="mb-8">
                <div className="aspect-square max-w-xs mx-auto overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-cyan-500/10">
                  <img
                    src={profileImageUrl}
                    alt={profile.name}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            <h2 className="text-3xl font-bold text-white mb-4">{profile.name}</h2>
            <p className="text-cyan-400 text-lg mb-6">{profile.title}</p>
            <div
              className="text-gray-300 leading-relaxed mb-8 prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: safeProfileBio }}
            />

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="w-5 h-5 text-cyan-400" />
                <a href={`mailto:${profile.email}`} className="hover:text-cyan-400 transition-colors">
                  {profile.email}
                </a>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <span>{profile.location}</span>
              </div>
            </div>

            <div className="flex gap-4">
              {social.github && (
                <a
                  href={social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 hover:border-cyan-400/50"
                >
                  <Github className="w-5 h-5 text-gray-300 hover:text-cyan-400" />
                </a>
              )}
              {social.linkedin && (
                <a
                  href={social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 hover:border-cyan-400/50"
                >
                  <Linkedin className="w-5 h-5 text-gray-300 hover:text-cyan-400" />
                </a>
              )}
              {social.twitter && (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 hover:border-cyan-400/50"
                >
                  <Twitter className="w-5 h-5 text-gray-300 hover:text-cyan-400" />
                </a>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-cyan-400" />
              Skills & Technologies
            </h3>
            <div className="flex flex-wrap gap-3">
              {profile.skills?.map((skill, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-cyan-400/10 text-cyan-400 rounded-lg border border-cyan-400/20 text-sm font-medium hover:bg-cyan-400/20 transition-colors"
                  style={{
                    animation: 'fadeInUp 0.6s ease-out',
                    animationDelay: `${index * 50}ms`,
                    animationFillMode: 'backwards',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Dog Section - The Team */}
        <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-violet-500/10 backdrop-blur-sm rounded-2xl p-8 lg:p-12 border border-cyan-400/20">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            Meet the Team
          </h2>
          {dog ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Dog Image */}
              <div className="order-2 lg:order-1">
                <div className="relative">
                  <div className="aspect-square rounded-2xl overflow-hidden border-4 border-cyan-400/30 shadow-2xl shadow-cyan-500/20">
                    {dogImageUrl ? (
                      <img
                        src={dogImageUrl}
                        alt={dog.name}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-black/40 flex items-center justify-center text-sm text-gray-500">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-4 -right-4 bg-cyan-500 text-black px-6 py-3 rounded-lg font-bold text-lg shadow-lg">
                    {dog.name}
                  </div>
                </div>
              </div>

              {/* Dog Info */}
              <div className="order-1 lg:order-2">
                <div className="inline-block px-4 py-2 bg-amber-400/10 text-amber-400 rounded-full border border-amber-400/20 text-sm font-medium mb-4">
                  {dog.role}
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">{dog.name}</h3>
                <div
                  className="text-gray-300 text-lg leading-relaxed mb-8 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: safeDogBio }}
                />

                <div className="space-y-3">
                  <h4 className="text-xl font-semibold text-cyan-400 mb-4">Special Skills:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {dog.skills?.map((skill, index) => (
                      <div
                        key={index}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                      >
                        ✓ {skill}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-300">
              <p>The team section will appear once a profile is added.</p>
            </div>
          )}
        </div>
      </ResponsiveSection>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default About;
