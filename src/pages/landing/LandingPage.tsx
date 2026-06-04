import { type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { useTheme } from "../../context/ThemeContext";
import TopNavbar from "../../components/Navbar/TopNavbar";

import heroBg from "../../assets/landing/hero.png";
import dashboardImg from "../../assets/landing/dashboard.png";
import emaImg from "../../assets/landing/ema.png";
import serviceDeskImg from "../../assets/landing/service-desk.png";
import reportImg from "../../assets/landing/report.png";
import settingImg from "../../assets/landing/setting.png";

import "./LandingPage.css";

type ModuleCard = {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  className: string;
};

const modules: ModuleCard[] = [
  {
    title: "Dashboard",
    description:
      "View operational overview, system status, and key IT insights in one place.",
    path: "/dashboard",
    image: dashboardImg,
    imageAlt: "Dashboard icon",
    className: "dashboard-card",
  },
  {
    title: "EMA",
    description:
      "Access endpoint management functions and manage EMA operations centrally.",
    path: "/hardware-inventory",
    image: emaImg,
    imageAlt: "EMA icon",
    className: "ema-card",
  },
  {
    title: "Service Desk",
    description:
      "Manage support requests, incidents, service activities, and operational tasks.",
    path: "/service-desk",
    image: serviceDeskImg,
    imageAlt: "Service Desk icon",
    className: "service-card",
  },
  {
    title: "Report",
    description:
      "Generate reports, review summaries, and access actionable operational outputs.",
    path: "/report",
    image: reportImg,
    imageAlt: "Report icon",
    className: "report-card",
  },
  {
    title: "Setting",
    description:
      "Configure system preferences, access control, and dashboard setup options.",
    path: "/settings",
    image: settingImg,
    imageAlt: "Setting icon",
    className: "setting-card",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  return (
    <div className={`landing-exact ${isDark ? "dark-theme" : "light-theme"}`}>
      <TopNavbar
        title="EMA"
        subtitle="Unified System"
        showBackButton={false}
        showSiteSelect={true}
        searchPlaceholder="Search module, report, ticket..."
      />

      <main className="main">
        <section className="content">
          <section
            className="hero"
            style={
              {
                "--landing-hero-bg": `url(${heroBg})`,
              } as CSSProperties
            }
          >
            <div className="hero-copy">
              <div className="eyebrow">Welcome back</div>

              <h2>How can we help you today?</h2>

              <p>
                Access Dashboard, EMA, Service Desk, Report, and Setting from
                one centralized workspace.
              </p>
            </div>
          </section>

          <section className="module-section">
            <div className="module-section-head">
              <span>Unified Workspace</span>
              <h3>Select your module</h3>
              <p>
                Choose the function you want to access from the EMA Unified
                System.
              </p>
            </div>
          </section>

          <section className="cards">
            {modules.map((module) => (
              <button
                key={module.title}
                type="button"
                className={`card ${module.className}`}
                onClick={() => navigate(module.path)}
              >
                <div className="illustration">
                  <img src={module.image} alt={module.imageAlt} />
                </div>

                <h3>{module.title}</h3>
                <p>{module.description}</p>

                <div className="card-foot">
                  <span className="arrow">
                    <ArrowRight size={20} />
                  </span>
                </div>
              </button>
            ))}
          </section>
        </section>

        <footer className="landing-footer">
          <span>© 2026 EMA Unified System. All rights reserved.</span>
          <a href="#">Privacy Policy</a>
          <span>•</span>
          <a href="#">Terms of Service</a>
        </footer>
      </main>
    </div>
  );
}
