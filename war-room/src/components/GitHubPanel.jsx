import { useEffect, useState } from "react";
import axios from "../api/axios";

export default function GitHubPanel({ boardId }) {
  const [repoData, setRepoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repoInput, setRepoInput] = useState("");

  const fetchGitHubData = async () => {
    if (!boardId) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`/boards/${boardId}/github`);
      setRepoData(response.data);
      setRepoInput(response.data?.repo?.url || "");
    } catch (err) {
      const message = err.response?.data?.message || "Failed to load GitHub data";

      if (message === "No GitHub repository linked to this board") {
        setRepoData(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGitHubData();
  }, [boardId]);

  const handleSaveRepo = async () => {
    if (!repoInput.trim()) {
      setError("Please enter a GitHub repository URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.patch(`/boards/${boardId}/github`, {
        githubRepo: repoInput.trim(),
      });
      await fetchGitHubData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save repository");
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSaveRepo}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Repo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          Loading GitHub data...
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !repoData && !error && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
          No repository linked yet. Add a GitHub repo URL above and save.
        </div>
      )}

      {repoData && (
        <>
          <section className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Repo Info</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <span className="font-medium">Name:</span> {repoData.repo?.name || "-"}
              </p>
              <p>
                <span className="font-medium">Stars:</span> {repoData.repo?.stars ?? "-"}
              </p>
              <p>
                <span className="font-medium">Last Updated:</span>{" "}
                {repoData.repo?.updatedAt
                  ? new Date(repoData.repo.updatedAt).toLocaleString()
                  : "-"}
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Latest Commits</h3>
            <div className="space-y-2">
              {(repoData.commits || []).length === 0 && (
                <p className="text-sm text-gray-500">No commits found.</p>
              )}
              {(repoData.commits || []).map((commit, index) => (
                <div key={`${commit.date || index}-${index}`} className="p-3 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-800 font-medium">{commit.message}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {commit.author || "Unknown"} • {commit.date ? new Date(commit.date).toLocaleString() : "Unknown date"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Open Pull Requests</h3>
            <div className="space-y-2">
              {(repoData.pulls || []).length === 0 && (
                <p className="text-sm text-gray-500">No open pull requests.</p>
              )}
              {(repoData.pulls || []).map((pr, index) => (
                <div key={`${pr.url || index}-${index}`} className="p-3 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-800 font-medium">{pr.title}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {pr.user || "Unknown"} • {pr.status || "open"}
                  </p>
                  {pr.url && (
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-xs text-blue-600 hover:underline"
                    >
                      View PR
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      </div>
    </div>
  );
}
