import { CalendarIcon, FileTextIcon } from '@radix-ui/react-icons'
import { BellIcon, Share2Icon } from 'lucide-react'

import { cn } from '@/helpers/utils'
import { Calendar } from '@/components/ui/calendar'
import AnimatedBeamMultipleOutputDemo from '@/registry/example/animated-beam-multiple-outputs'
import AnimatedListDemo from '@/registry/example/animated-list-demo'
import { BentoCard, BentoGrid } from '@/registry/magicui/bento-grid'
import { Marquee } from '@/registry/magicui/marquee'

const files = [
  {
    name: 'bitcoin.pdf',
    body: 'Bitcoin is a cryptocurrency invented in 2008 by an unknown person or group.',
  },
  {
    name: 'finances.xlsx',
    body: 'A spreadsheet file made of rows and columns to sort and calculate data.',
  },
  {
    name: 'logo.svg',
    body: 'SVG is an XML-based vector format for high-quality, scalable graphics.',
  },
  {
    name: 'keys.gpg',
    body: 'GPG keys encrypt and decrypt files while authenticating messages.',
  },
  {
    name: 'seed.txt',
    body: 'A seed phrase stores information needed to recover wallet funds.',
  },
]

const features = [
  {
    Icon: FileTextIcon,
    name: 'Save your files',
    description: 'We automatically save your files as you type.',
    href: '#',
    cta: 'Learn more',
    className: 'bento-col-1',
    background: (
      <Marquee pauseOnHover className="bento-marquee">
        {files.map((file, index) => (
          <figure key={index} className={cn('bento-file-card')}>
            <figcaption>{file.name}</figcaption>
            <blockquote>{file.body}</blockquote>
          </figure>
        ))}
      </Marquee>
    ),
  },
  {
    Icon: BellIcon,
    name: 'Notifications',
    description: 'Get notified when something happens.',
    href: '#',
    cta: 'Learn more',
    className: 'bento-col-2',
    background: <AnimatedListDemo className="bento-fg-surface" />,
  },
  {
    Icon: Share2Icon,
    name: 'Integrations',
    description: 'Supports 100+ integrations and counting.',
    href: '#',
    cta: 'Learn more',
    className: 'bento-col-2',
    background: <AnimatedBeamMultipleOutputDemo className="bento-fg-surface" />,
  },
  {
    Icon: CalendarIcon,
    name: 'Calendar',
    description: 'Use the calendar to filter your files by date.',
    className: 'bento-col-1',
    href: '#',
    cta: 'Learn more',
    background: <Calendar mode="single" selected={new Date(2022, 4, 11, 0, 0, 0)} className="bento-calendar" />,
  },
]

export function BentoDemo() {
  return (
    <BentoGrid>
      {features.map((feature, index) => (
        <BentoCard key={index} {...feature} />
      ))}
    </BentoGrid>
  )
}
