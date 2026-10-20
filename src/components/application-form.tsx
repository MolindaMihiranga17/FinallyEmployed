import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationSchema,
  arrangements,
  emptyApplication,
  statuses,
  toLocalInput,
  type Application,
  type ApplicationInput,
} from "../lib/applications";
import { Button } from "./ui/button";
import { useState } from "react";
import { errorMessage } from "../lib/utils";
export function ApplicationForm({
  application,
  onSave,
  onCancel,
}: {
  application?: Application;
  onSave: (values: ApplicationInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: application
      ? {
          ...application,
          applied_on: application.applied_on ?? "",
          next_action_at: toLocalInput(application.next_action_at),
        }
      : emptyApplication,
  });
  const field = (
    name: keyof ApplicationInput,
    label: string,
    type = "text",
    placeholder = "",
  ) => (
    <label className="field">
      <span>{label}</span>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] && (
        <small id={`${name}-error`} className="error-text">
          {errors[name]?.message}
        </small>
      )}
    </label>
  );
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          await onSave(values);
        } catch (e) {
          setError(errorMessage(e, "Could not save. Please try again."));
        }
      })}
    >
      <fieldset disabled={isSubmitting} className="form-grid">
        {field("company", "Company *", "text", "e.g. Acme")}
        {field("job_title", "Job title *", "text", "e.g. Frontend Engineer")}
        {field("job_url", "Job URL", "url", "https://…")}
        {field("location", "Location", "text", "e.g. Colombo, Sri Lanka")}
        <label className="field">
          <span>Status</span>
          <select {...register("status")}>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Work arrangement</span>
          <select {...register("work_arrangement")}>
            {arrangements.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {field("applied_on", "Application date", "date")}
        {field("next_action_at", "Next action date & time", "datetime-local")}
        <div className="span-2">
          {field(
            "next_action",
            "Next action",
            "text",
            "e.g. Prepare for technical interview",
          )}
        </div>
        <label className="field span-2">
          <span>Notes</span>
          <textarea
            rows={5}
            {...register("notes")}
            placeholder="Recruiter details, interview prep, or anything to remember…"
          />
          {errors.notes && (
            <small className="error-text">{errors.notes.message}</small>
          )}
        </label>
      </fieldset>
      <p className="form-hint">
        Application date is required after Saved. Times use your device’s
        timezone.
      </p>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button disabled={isSubmitting}>
          {isSubmitting
            ? "Saving…"
            : application
              ? "Save changes"
              : "Add application"}
        </Button>
      </div>
    </form>
  );
}
