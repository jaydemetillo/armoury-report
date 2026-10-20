import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { DialRoot } from 'dialkit'
import 'dialkit/styles.css'
import { DashboardIterations, LogsQuestions, SupplyDemand } from '@/components/AdminGap'
import { BeforeAfter } from '@/components/BeforeAfter'
import { Figure } from '@/components/Figure'
import { Headline } from '@/components/Headline'
import { GalleryHero } from '@/components/GalleryHero'
import { Hero3D } from '@/components/Hero3D'
import { Journey } from '@/components/Journey'
import { CheckTimeChart, EmtSlope, FixGrid } from '@/components/LastMile'
import { Lessons } from '@/components/Lessons'
import { Masthead } from '@/components/Masthead'
import { NorthStar } from '@/components/NorthStar'
import { NumbersExplorer } from '@/components/NumbersExplorer'
import { PullQuote } from '@/components/PullQuote'
import { ReadinessScrolly } from '@/components/ReadinessScrolly'

function Prose({ children }: { children: ReactNode }) {
  return <div className="prose-body">{children}</div>
}

function Chapter({ id, number, title, children }: { id?: string; number: string; title: string; children?: ReactNode }) {
  return (
    <div id={id} className="prose-body scroll-mt-20 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="font-serif text-[22px] text-[var(--accent)] italic">{number}</span>
          <span className="h-px flex-1 bg-rule" />
        </div>
        <h2 className="section-title m-0 mb-7">{title}</h2>
      </motion.div>
      {children}
    </div>
  )
}

// Photo gallery hero (image carousel) is hidden for now. Set to true to bring it back.
const SHOW_GALLERY_HERO = false

export default function App() {
  return (
    <div id="top">
      <Masthead />
      <main>
        <Headline />
        {SHOW_GALLERY_HERO && <GalleryHero />}

        <article>
          <Prose>
            <p className="dropcap pt-6">
              Every day, across Singapore, SCDF crews walk around their fire engines, ambulances and rescue appliances
              and check that everything is there and working, from hose couplings to breathing sets. Until recently,
              most of that work ended up in a binder.
            </p>
            <p>
              Armoury began as a Hack for Public Good project in 2023 with a simple but consequential question:
            </p>
          </Prose>

          <PullQuote cite="The question behind Armoury">
            What if the equipment checks behind Singapore’s emergency response did not live on paper?
          </PullQuote>

          <Prose>
            <p>
              By mid-2026, Armoury was a maintained, stable platform used at <strong>all 23 SCDF fire stations</strong>,
              covering <strong>100% of checklists</strong> for vehicles, equipment and PPE. It digitised high-frequency
              operational checks, made submissions visible in real time, and gave stations and HQ a shared, live view
              of readiness.
            </p>
            <p>
              This isn’t only a story about a product. It’s about a different way to build in government: start small,
              test with real users, find where the real problem is, and keep iterating until the product proves its
              value or tells you what to do next.
            </p>
          </Prose>

          <Journey />

          <ReadinessScrolly />

          <Chapter number="01" title="A record of readiness, written on paper">
            <p>
              The status quo was liveable. Paper satisfied audit storage. FormSG and Vault had been tried, but lacked
              the overview and history SCDF needed. Collating data was manual, and HQ could not make sense of it across
              stations and vehicles.
            </p>
            <p>
              Paper in a fire station is a strange thing. Hoses are tested daily, equipment moves, vehicles roll out,
              and the work happens around water and urgency. Yet the official record of readiness sat on forms in a
              binder. The friction was obvious. The bigger problem was harder to see.
            </p>
          </Chapter>

          <PullQuote>Paper does not compound into operational intelligence.</PullQuote>

          <Prose>
            <p>
              A station could complete a check and a binder could store it. But HQ could not ask which stations were
              consistently late, which appliances kept failing, which shifts were missing checks, or whether divisions
              were following up fast enough. SCDF didn’t need a nicer checklist. It needed daily readiness data to
              become <strong>visible, trustworthy and useful</strong>.
            </p>
          </Prose>

          <Chapter id="origin" number="02" title="It started as “Tinder for Checks”">
            <p>
              The hackathon team went to stations to watch equipment checks first-hand, talked to SCDF users and built
              a working proof of concept. The first version was scrappy enough that the team still jokes about it,
              but it was something users could hold, react to and improve.
            </p>
          </Chapter>

          <Figure
            src={`${import.meta.env.BASE_URL}images/checklist.jpg`}
            alt="A gloved hand holding a phone showing a checklist, with a fire engine behind"
            caption="Armoury replaced station binders with a check flow built for gloves, water and urgency."
            credit="Illustration: placeholder for SCDF photography"
          />

          <Prose>
            <p>Even at pitch stage, the ambition went beyond digitising a form. The pitch promised six things:</p>
            <ol className="mb-8 grid list-none gap-x-8 gap-y-3 p-0 text-[16px] sm:grid-cols-2">
              {[
                'Load vehicle data into a customisable CMS',
                'See the live status of every vehicle in the fleet',
                'Start a check on any vehicle',
                'Let several checkers work on one check at once',
                'Submit completed checks',
                'Read operational insights on a dashboard',
              ].map((item, i) => (
                <li key={item} className="flex gap-3 border-t border-rule pt-3 text-ink-2">
                  <span className="font-serif text-[20px] leading-none text-[var(--accent)]">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
            <p>
              The pitch even imagined Armoury spreading to SPF, SAF, RSAF and the Navy, and beyond vehicles to welfare
              checks, building and environmental inspections. That instinct to expand would later become both an
              opportunity and a strategic tension.
            </p>
          </Prose>

          <Chapter id="adoption" number="03" title="First, prove that frontliners would use it">
            <p>
              The original North Star was simple: <strong>the number of checks submitted</strong>. Before insight,
              analytics or admin workflows, Armoury had to answer the most basic product question.
            </p>
          </Chapter>

          <PullQuote cite="The first product question">Will frontliners actually use this every day?</PullQuote>

          <Prose>
            <p>
              The team validated with firefighters, EMTs, drivers and other operational users. Switching from paper
              had to feel worthwhile, not just mandated. For an operational tool, adoption isn’t a vanity metric:
              without daily submissions there is no data, no trust and no value.
            </p>
            <p>
              It worked. By Q1 2026, Armoury had 100% target checklist coverage and 110,658 submissions in the
              quarter. By Q2: <strong>113,919 submissions, 2,225 checklists and a 96.5% submission rate</strong>.
            </p>
          </Prose>

          <BeforeAfter />
          <CheckTimeChart />

          <PullQuote size="xl" cite="Q3 2026 product review">
            Armoury was a project. Armoury is a maintained, stable platform.
          </PullQuote>

          <Chapter id="admin-gap" number="04" title="Success lit a spark at HQ">
            <p>
              The team had moved fast to keep thousands of frontline users happy, and that was the right call. But
              Armoury had a second, smaller group with more complex needs: the HQ and admin users who build
              checklists, interpret data and manage compliance.
            </p>
          </Chapter>

          <PullQuote cite="Armoury closure sharing">
            Frontline users loved us, adoption was growing, everything seemed perfect. But we didn’t know there was a
            spark igniting.
          </PullQuote>

          <Prose>
            <p>
              Now that the data existed, HQ could ask questions it never could before: which stations are late, which
              equipment is often marked “no”, which shifts miss checks. Armoury had to deliver two kinds of value:{' '}
              <strong>fast, simple daily checks</strong> for the frontline, and <strong>insight, accountability and
              decisions</strong> for HQ.
            </p>
            <p>
              By Q4 2025, frontline satisfaction was high but admins struggled to get value out of the data, among
              them HQ’s Logs, Ops and EMSD departments and the Divisional ICs. The team iterated through three
              dashboards with them.
            </p>
          </Prose>

          {/* Scroll-driven 3D model. Move this one line to place it anywhere else on the page. */}
          <Hero3D className="mt-16" />

          <DashboardIterations />

          <Prose>
            <p>
              V3 worked for Ops and EMSD. Logs still rated it poorly, because they wanted to make procurement decisions
              with it, and that needed more than Armoury could provide.
            </p>
          </Prose>

          <LogsQuestions />

          <PullQuote>
            Armoury tracks compliance and readiness. It does not own the full inventory and procurement truth.
          </PullQuote>

          <Prose>
            <p>
              Instead of rebuilding ILMS or turning Armoury into an inventory system, the team partnered with TFTD, SCDF’s
              data branch. Armoury supplies the demand signal and ILMS the supply signal. Don’t grow a product just
              because users ask for a related workflow: understand the system, find the right owner, and connect the
              data where it makes sense.
            </p>
          </Prose>

          <SupplyDemand />

          <div className="h-16" />
          <NorthStar />

          <Chapter id="last-mile" number="05" title="The last mile before maintenance">
            <p>
              The final stretch of active development had one aim: make Armoury good enough to step back from. Q1 CSAT
              had fallen to 3.68. A UI audit found too many navigation steps, inconsistent patterns and a cluttered
              home screen, and SUS sat at 67, just under the industry average of 68.
            </p>
            <p>
              UI V2 shipped on <strong>6 July 2026</strong>. Alongside it came a run of targeted fixes, each aimed at a
              specific source of friction.
            </p>
          </Chapter>

          <FixGrid />
          <EmtSlope />

          <Prose>
            <p>
              Reports changed too. PDFs now surface outstanding issues instead of making commanders scan every passing
              item, and they keep each question’s original wording so later edits can’t distort the record.
            </p>
          </Prose>

          <section id="numbers" className="scroll-mt-20 pt-16">
            <div className="prose-body">
              <div className="mb-3 flex items-center gap-3">
                <span className="font-serif text-[22px] text-[var(--accent)] italic">06</span>
                <span className="h-px flex-1 bg-rule" />
              </div>
              <h2 className="section-title m-0">Armoury in numbers</h2>
              <p className="mt-4 text-ink-2">Choose a metric to see how it moved over three quarters.</p>
            </div>
            <NumbersExplorer />
          </section>

          <Lessons />

          <Chapter number="07" title="Maintenance, by design">
            <p>
              Armoury entered maintenance on 6 July 2026, after UI V2 shipped, CSAT recovered, PPE checks went live
              everywhere, VAPT was complete, runbooks and monitoring were in place, and SCDF signed off.
            </p>
          </Chapter>

          <PullQuote cite="The Armoury team">Maintenance is sustaining, not sunsetting.</PullQuote>

          <div className="mx-auto mb-10 grid max-w-[860px] gap-6 px-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-rule p-6">
              <div className="mb-3 text-[13px] font-semibold tracking-[0.1em] text-ready uppercase">Still covered</div>
              <ul className="m-0 list-none space-y-2 p-0 text-[15px] text-ink-2">
                {[
                  'The product keeps running',
                  'Security issues get fixed',
                  'Data loss or corruption bugs get handled',
                  'Compliance and legal changes are addressed',
                  'Forced dependency or platform changes are managed',
                  'Users get support through defined channels',
                ].map((x) => (
                  <li key={x}>✓ {x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rule p-6">
              <div className="mb-3 text-[13px] font-semibold tracking-[0.1em] text-muted uppercase">Out of scope</div>
              <ul className="m-0 list-none space-y-2 p-0 text-[15px] text-muted">
                {['New features', 'Cosmetic optimisations', 'Open-ended roadmap expansion'].map((x) => (
                  <li key={x}>– {x}</li>
                ))}
              </ul>
              <p className="m-0 mt-4 text-[14px] text-muted">…unless separately funded or reactivated.</p>
            </div>
          </div>

          <Chapter id="next" number="08" title="What comes next" />
          <div className="mx-auto mt-2 grid max-w-[1100px] gap-6 px-5 md:grid-cols-3">
            {[
              ['Track 1', 'Keep Armoury stable for SCDF', 'Department contacts and admins are the front door for users. Longer-term maintenance funding and ownership are being worked through.'],
              ['Track 2', 'Sense whole-of-government demand', 'Armoury may open to other agencies with no product changes: a test of who wants it, why, and whether that justifies future investment.'],
              ['Track 3', 'Move to the next problem', 'Pulse, a healthcare inventory initiative, and SCDF’s likely next area, capability planning. The bar: a real sponsor, measurable impact and clarity.'],
            ].map(([k, t, b], i) => (
              <motion.div
                key={k}
                className="border-t-2 pt-4"
                style={{ borderColor: i === 0 ? 'var(--accent)' : 'var(--color-ink)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">{k}</div>
                <div className="mt-1 font-serif text-[28px] leading-tight">{t}</div>
                <p className="m-0 mt-2 text-[15px] leading-relaxed text-ink-2">{b}</p>
              </motion.div>
            ))}
          </div>
          <Prose>
            <p className="mt-10">
              A strong partner relationship isn’t enough on its own. The next problem still has to be proven.
            </p>
          </Prose>

          <section className="dark-band mt-24 bg-night py-24 text-[#e9e5dc]">
            <div className="prose-body [&_p]:!text-[#d5d0c6]">
              <p className="kicker mb-6">The Armoury story, in one breath</p>
              <p className="font-serif !text-[28px] !leading-snug !text-white">Armoury started with paper.</p>
              <p>
                Actual paper: checklists printed, filled, filed and stored in fire stations. Paper that could prove a
                check happened, but couldn’t give commanders live readiness or tell HQ what was happening across the
                force.
              </p>
              <p>
                A scrappy hackathon build became one checklist, then many, then a platform covering vehicles,
                equipment and PPE across every station. Adoption came. Then success created the next problem: once the
                data existed, everyone wanted to use it. The team learned that digitising the front door creates
                expectations in every room behind it.
              </p>
              <p>
                So Armoury matured. It got sharper dashboards, clear boundaries, better reports, PPE checks, UI V2 and a
                security review, and its North Star moved from volume to satisfaction.
              </p>
            </div>
            <PullQuote size="xl" tone="dark" cite="July 2026">
              This product does what it was built to do.
            </PullQuote>
            <div className="prose-body [&_p]:!text-[#d5d0c6]">
              <p>
                Not perfectly, and not as a platform that should absorb every adjacent workflow. But as SCDF’s daily
                readiness platform, Armoury landed: faster checks for frontliners, visibility for HQ, and a model for
                how a government product can mature, stop and be maintained on purpose.
              </p>
              <p>
                Build with users. Prove adoption. Follow the data. Respect operational reality. Change the metric when
                the product matures. And know when the right move isn’t another feature but a responsible handover.
              </p>
              <p className="mt-14 text-center font-serif !text-[44px] !text-white italic">Every check matters.</p>
            </div>
          </section>
        </article>
      </main>

      <footer className="mx-auto max-w-[860px] px-5 py-14">
        <div className="credit grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 font-semibold text-ink">Sources</div>
            Armoury working document and Hack for Public Good pitch (2023); Armoury closure sharing draft; Vision &amp;
            Metrics page; Q1 and Q3 2026 product reviews; VAPT report by Cure53 (2026).
          </div>
          <div>
            <div className="mb-2 font-semibold text-ink">Notes</div>
            Quarterly figures are as reported in Armoury product reviews. Illustrations are placeholders pending SCDF
            photography. Built by Open Government Products.
          </div>
        </div>
      </footer>

      {/* Dev builds always show DialKit; a production build shows it only when built with VITE_DIALKIT=true. */}
      <DialRoot
        position="bottom-right"
        defaultOpen={false}
        productionEnabled={import.meta.env.VITE_DIALKIT === 'true'}
      />
    </div>
  )
}
