import React from 'react'
import Link from 'next/link'
import { Mail, GitHub, Linkedin, Twitter } from 'lucide-react'
import { getPayloadClient } from '@/lib/payload'

const Footer = async () => {
  const currentYear = new Date().getFullYear()
  const payload = await getPayloadClient()
  
  let profile = null
  try {
    profile = await payload.findGlobal({
      slug: 'about',
    })
  } catch {
    profile = null
  }

  const socialLinks = []
  if (profile?.social?.github) {
    socialLinks.push({ icon: GitHub, href: profile.social.github, label: 'GitHub' })
  }
  if (profile?.social?.linkedin) {
    socialLinks.push({ icon: Linkedin, href: profile.social.linkedin, label: 'LinkedIn' })
  }
  if (profile?.social?.twitter) {
    socialLinks.push({ icon: Twitter, href: profile.social.twitter, label: 'Twitter' })
  }
  if (profile?.email) {
    socialLinks.push({ icon: Mail, href: `mailto:${profile.email}`, label: 'Email' })
  }

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
                <Link href="/projects" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-cyan-400 text-sm transition-colors">
                  About
                </Link>
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
            © {currentYear} Portfolio. Built with Next.js & Payload CMS.
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/terms" className="text-gray-500 hover:text-cyan-400 text-xs transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-gray-500 hover:text-cyan-400 text-xs transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
