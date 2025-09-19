import React, { useState, useEffect, useContext } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { ReportDisplay } from "../components/ReportDisplay";
import styles from "../styles/Jobs.module.css";
import "../styles/globals-jobs.css";
import "@progress/kendo-theme-default/dist/all.css";
import { JobResponse, JobsListResponse } from "../types/job";
// import { AppContext } from "@ctip/cip-framework-client";
import { useRouter } from "next/router";


const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobResponse | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [refreshingJobs, setRefreshingJobs] = useState<Set<string>>(new Set());
  const [showControlsProcessed, setShowControlsProcessed] = useState(true);
  // const user = useContext(AppContext);
  const userName =  "Guest";
  const router = useRouter();


  // Fetch user's jobs
  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const baseURL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
      const appURL = baseURL.includes('localhost') || baseURL.includes('clvrw99a1065') ? '' : '/tprss';


      const response = await fetch(
        `${appURL}/api/jobs-mock?userId=${encodeURIComponent(userName)}`
      );


      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }


      const data: JobsListResponse = await response.json();
      setJobs(data.jobs);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };


  // Fetch specific job status
  const fetchJobStatus = async (jobUUID: string) => {
    try {
      setRefreshingJobs((prev) => new Set(prev).add(jobUUID));
      const baseURL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
      const appURL = baseURL.includes('localhost') || baseURL.includes('clvrw99a1065') ? '' : '/tprss';


      const response = await fetch(
        `${appURL}/api/jobs-mock?userId=${encodeURIComponent(userName)}`
      );


      if (!response.ok) {
        throw new Error("Failed to fetch job status");
      }


      const jobData: JobResponse = await response.json();


      // Update the job in the jobs list
      setJobs((prevJobs) =>
        prevJobs.map((job) => (job.UUID === jobUUID ? jobData : job))
      );
    } catch (err) {
      console.error("Error fetching job status:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch job status"
      );
    } finally {
      setRefreshingJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jobUUID);
        return newSet;
      });
    }
  };


  // View report for completed job
  const viewReport = (job: JobResponse) => {
    if (job.status === "Completed" && job.result?.report) {
      setSelectedJob(job);
      setShowReport(true);
    }
  };


  // Download CSV for completed job
  const downloadCSV = (job: JobResponse) => {
    if (job.status === "Completed" && job.result?.report) {
      const report = job.result.report;
      const headers =
        "MainQuestion,Question,SubQuestion,Answer,Answer_Quality,Answer_Source,Summary,Reference\n";
      const rows = report
        .map((item: any) => {
          const rowData = [
            item.MainQuestion,
            item.Question,
            item.SubQuestion,
            item.Answer,
            item.Answer_Quality,
            item.Answer_Source,
            item.Summary,
            item.Reference,
          ];
          const row = rowData.map(
            (cell) => `"${(cell || "N/A").toString().replace(/"/g, '""')}"`
          );
          return row.join(",");
        })
        .join("\n");


      const csvContent = headers + rows;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `assessment_report_${job.UUID}.csv`;
      link.click();
    }
  };


  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Completed":
        return styles.statusCompleted;
      case "Processing":
        return styles.statusProcessing;
      case "Failed":
        return styles.statusFailed;
      default:
        return styles.statusPending;
    }
  };


  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };


  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };


  function formatProcessingTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes} min ${seconds} sec`;
  }


  useEffect(() => {
    
      fetchJobs();
    
  }, []);


  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <h2>Loading your jobs...</h2>
        </div>
      </div>
    );
  }


  if (showReport && selectedJob) {
    return (
      <div className={styles.container}>
        <div className={styles.reportHeader}>
          <h2>Assessment Report - {selectedJob.zipFileName}</h2>
          <p>Job UUID: {selectedJob.UUID}</p>
          <p>Completed: {formatDate(selectedJob.updatedAt)}</p>
        </div>


        <div className={styles.actionButtons}>
          <Button
            onClick={() => setViewMode(viewMode === "table" ? "card" : "table")}
            themeColor={"secondary"}
          >
            {viewMode === "table" ? "Card View" : "Table View"}
          </Button>
          <Button
            onClick={() => downloadCSV(selectedJob)}
            themeColor={"success"}
          >
            Download CSV
          </Button>
          <Button
            onClick={() => setShowReport(false)}
            themeColor={"error"}
            fillMode="outline"
          >
            Back to Jobs
          </Button>
        </div>


        <ReportDisplay
          results={selectedJob.result?.report || []}
          viewMode={viewMode}
          totalTime={selectedJob.result?.processingTime || 0}
        />
      </div>
    );
  }


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Your Assessment Jobs</h1>
        <p>Track the status of your vendor assessment submissions</p>
      </div>


      {error && (
        <div className={styles.alertDanger} role="alert">
          {error}
        </div>
      )}


      <div className={styles.actionButtons}>
        <Button onClick={fetchJobs} themeColor={"success"} fillMode="outline">
          Refresh Jobs
        </Button>
        <Button
          onClick={() => router.push("/assess")}
          themeColor={"success"}
          fillMode="outline"
          className={styles.actionButton}
        >
          Submit a New Assessment
        </Button>
        <Button
          onClick={() => setShowControlsProcessed(!showControlsProcessed)}
          themeColor={"info"}
          fillMode="outline"
          className={styles.actionButton}
        >
          {showControlsProcessed ? "Hide" : "Show"} Controls Processed
        </Button>
      </div>


      {jobs.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No jobs found</h3>
          <p>You haven't submitted any assessment jobs yet.</p>
          <Button
            onClick={() => router.push("/assess")}
            themeColor={"primary"}
          >
            Submit New Assessment
          </Button>
        </div>
      ) : (
        <div className={styles.jobsList}>
          {jobs.map((job) => (
            <div key={job.UUID} className={styles.jobCard}>
              <div className={styles.jobHeader}>
                <div className={styles.jobInfo}>
                  <h3>{job.zipFileName || "Unknown File"}</h3>
                  <div className={styles.jobUUID}>{job.UUID}</div>
                  <div className={styles.jobDate}>
                    {formatDate(job.createdAt)}
                  </div>
                  {job.zipFileSize && (
                    <div className={styles.jobSize}>
                      {formatFileSize(job.zipFileSize)}
                    </div>
                  )}
                </div>
                <div className={styles.jobStatus}>
                  <span
                    className={`${styles.statusBadge} ${getStatusBadgeClass(
                      job.status
                    )}`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>


              <div className={styles.jobActions}>
                <Button
                  onClick={() => fetchJobStatus(job.UUID)}
                  disabled={refreshingJobs.has(job.UUID)}
                  themeColor={"info"}
                  fillMode="outline"
                  size="small"
                >
                  {refreshingJobs.has(job.UUID)
                    ? "Refreshing..."
                    : "Fetch Status"}
                </Button>


                {job.status === "Completed" && (
                  <>
                    <Button
                      onClick={() => viewReport(job)}
                      themeColor={"success"}
                      size="small"
                    >
                      View Report
                    </Button>
                    <Button
                      onClick={() => downloadCSV(job)}
                      themeColor={"secondary"}
                      fillMode="outline"
                      size="small"
                    >
                      Download CSV
                    </Button>
                  </>
                )}


                {job.status === "Failed" && job.result?.error && (
                  <div className={styles.errorMessage}>
                    <strong>Error:</strong> {job.result.error}
                  </div>
                )}
              </div>


              {job.status === "Completed" && job.result && (
                <div className={styles.jobSummary}>
                  <p>
                    <strong>Total Files:</strong> {job.result.totalFiles}
                  </p>
                  <p>
                    <strong>Total Controls:</strong> {job.result.totalControls}
                  </p>
                  <p>
                    <strong>Processing Time:</strong>{" "}
                    {formatProcessingTime(job.result.processingTime || 0)}
                  </p>
                </div>
              )}


              {job.status === "Processing" && job.progress && showControlsProcessed && (
                <div className={styles.jobSummary}>
                  <p>
                    <strong>Controls Processed:</strong> {job.progress.completedControls} of {job.progress.totalControls}
                  </p>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressBarFill}
                      style={{'--progress-width': `${Math.round((job.progress.completedControls / job.progress.totalControls) * 100)}%`} as React.CSSProperties}
                    />
                  </div>
                  <div className={styles.progressPercentage}>
                    {Math.round((job.progress.completedControls / job.progress.totalControls) * 100)}%
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export default JobsPage;

