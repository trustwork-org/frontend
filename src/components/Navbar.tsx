import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/app', label: 'Find Work' },
  { to: '/app/dashboard', label: 'My Jobs' },
  { to: '/app/activity', label: 'Activity' },
  { to: '/app/chat', label: 'Messages' },
  { to: '/app/dispute', label: 'Disputes' },
  { to: '/app/arbitrate', label: 'Arbitrate' },
  { to: '/app/profile', label: 'Profile' },
]

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm transition-all ${
    isActive ? 'text-[#14a800] font-medium bg-[#e6f4e1]' : 'text-[#6b6b6b] hover:bg-[#f7f7f5] hover:text-[#1c1c1c]'
  }`

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { displayAddress, logout } = useAuth()

  const handleSignOut = () => { logout().then(() => navigate('/signin')) }

  // Initials for avatar: first two chars of address after '0x'
  const initials = displayAddress ? displayAddress.slice(2, 4).toUpperCase() : '??'

  return (
    <>
      <nav className="bg-white border-b border-[#e0e0dc] flex items-center px-4 md:px-6 h-14 gap-4 sticky top-0 z-50">
        {/* Logo — links to landing page */}
        <NavLink to="/" className="text-[22px] text-[#14a800] shrink-0 hover:opacity-80 transition-opacity" style={{ fontFamily: "'DM Serif Display', serif" }}>
          TrustWork
        </NavLink>

        {/* Desktop nav links */}
        <div className="hidden md:flex gap-0.5 flex-1">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} end className={linkCls}>{label}</NavLink>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0 ml-auto">
          <button
            onClick={() => navigate('/app/post')}
            className="px-4 py-1.5 border border-[#14a800] text-[#14a800] rounded-full text-[13px] font-medium hover:bg-[#e6f4e1] transition-all"
          >
            + Post a Job
          </button>
          <div className="relative group">
            <div className="w-8 h-8 rounded-full bg-[#14a800] text-white text-[13px] font-semibold flex items-center justify-center cursor-pointer">
              {initials}
            </div>
            {/* Hover zone starts at the avatar's bottom edge (top-8) so the cursor
                never leaves a hovered element while travelling down to the menu.
                pt-2 inside keeps the visible card visually spaced from the avatar. */}
            <div className="absolute right-0 top-8 pt-2 w-40 hidden group-hover:block z-50">
              <div className="bg-white border border-[#e0e0dc] rounded-xl shadow-lg py-1">
                <NavLink to="/app/profile" className="block px-4 py-2 text-[13px] text-[#1c1c1c] hover:bg-[#f7f7f5]">Profile</NavLink>
                <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-[13px] text-red-500 hover:bg-red-50">Sign out</button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile right */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          <button
            onClick={() => navigate('/app/post')}
            className="px-3 py-1 border border-[#14a800] text-[#14a800] rounded-full text-[12px] font-medium hover:bg-[#e6f4e1] transition-all"
          >
            + Post
          </button>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-[#f7f7f5] transition-all"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-[#1c1c1c] transition-all ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[#1c1c1c] transition-all ${open ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[#1c1c1c] transition-all ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-b border-[#e0e0dc] px-4 py-3 flex flex-col gap-1 z-40">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} end className={linkCls} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          <div className="border-t border-[#e0e0dc] mt-2 pt-2">
            <button onClick={handleSignOut} className="w-full text-left px-3 py-1.5 text-[13px] text-red-500 rounded-md hover:bg-red-50">
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
