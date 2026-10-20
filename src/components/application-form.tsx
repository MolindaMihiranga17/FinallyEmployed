import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationSchema,
  arrangements,
  emptyApplication,
  statuses,
  roleTypes,
  assessmentStatuses,
  parseTechStack,
  suggestedTechnologies,
  toLocalInput,
  type Application,
  type ApplicationInput,
} from "../lib/applications";
import { Button } from "./ui/button";
import { useState } from "react";
import { errorMessage } from "../lib/utils";
import {
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  LoaderCircle,
  Check,
  Code2,
} from "lucide-react";
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
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: application
      ? {
          ...emptyApplication,
          ...application,
          application_deadline: application.application_deadline ?? "",
          applied_on: application.applied_on ?? "",
          next_action_at: toLocalInput(application.next_action_at),
        }
      : emptyApplication,
  });
  const currentStatus = watch("status");
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
      <fieldset disabled={isSubmitting} className="form-section">
        <legend>
          <span className="section-icon">
            <BriefcaseBusiness size={19} />
          </span>
          <span>
            Job details<small>The essentials about the role and company.</small>
          </span>
        </legend>
        <div className="form-grid">
          {field("company", "Company *", "text", "e.g. Acme")}
          {field("job_title", "Job title *", "text", "e.g. Frontend Engineer")}
          {field("job_url", "Job URL", "url", "https://…")}
          {field("location", "Location", "text", "e.g. Colombo, Sri Lanka")}
          <label className="field">
            <span>Work arrangement</span>
            <select {...register("work_arrangement")}>
              {arrangements.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Role type</span>
            <select {...register("role_type")}>
              {roleTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          {field("application_deadline", "Application deadline", "date")}
        </div>
      </fieldset>
      <fieldset disabled={isSubmitting} className="form-section">
        <legend>
          <span className="section-icon">
            <Code2 size={19} />
          </span>
          <span>
            Tech stack & preparation
            <small>
              Capture the skills, projects, and assessments for this role.
            </small>
          </span>
        </legend>
        <div className="form-grid">
          <label className="field span-2">
            <span id="tech-stack-label">Required tech stack</span>
            <input
              {...register("tech_stack", {
                setValueAs: (value) =>
                  typeof value === "string" ? parseTechStack(value) : value,
              })}
              placeholder="React, TypeScript, SQL"
              aria-labelledby="tech-stack-label"
              aria-invalid={!!errors.tech_stack}
              aria-describedby="tech-stack-help tech-stack-error"
            />
            <small id="tech-stack-help">
              Separate technologies with commas. Up to 20, including your own
              tools.
            </small>
            {errors.tech_stack && (
              <small id="tech-stack-error" className="error-text">
                {errors.tech_stack.message || "Check the technology names."}
              </small>
            )}
          </label>
          <div
            className="tech-suggestions span-2"
            role="group"
            aria-label="Suggested technologies"
          >
            {suggestedTechnologies.map((tech) => (
              <button
                type="button"
                key={tech}
                aria-pressed={(watch("tech_stack") ?? []).some(
                  (tag) => tag.toLowerCase() === tech.toLowerCase(),
                )}
                onClick={() => {
                  const stack = watch("tech_stack") ?? [];
                  const exists = stack.some(
                    (tag) => tag.toLowerCase() === tech.toLowerCase(),
                  );
                  setValue(
                    "tech_stack",
                    exists
                      ? stack.filter(
                          (tag) => tag.toLowerCase() !== tech.toLowerCase(),
                        )
                      : [...stack, tech],
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              >
                {tech}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Coding assessment progress</span>
            <select {...register("assessment_status")}>
              {assessmentStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          {field(
            "assessment_url",
            "Coding assessment link",
            "url",
            "https://...",
          )}
          {field(
            "portfolio_url",
            "Portfolio or project link",
            "url",
            "https://github.com/your-name/project",
          )}
          <p className="field-help">
            Use the next action below to schedule assessment preparation or a
            submission reminder.
          </p>
          <label className="field span-2">
            <span>Preparation notes</span>
            <textarea
              rows={4}
              {...register("prep_notes")}
              aria-invalid={!!errors.prep_notes}
              placeholder="DSA topics to revise, projects to discuss, questions to ask..."
            />
            {errors.prep_notes && (
              <small className="error-text">{errors.prep_notes.message}</small>
            )}
          </label>
        </div>
      </fieldset>
      <fieldset disabled={isSubmitting} className="form-section">
        <legend>
          <span className="section-icon">
            <CalendarDays size={19} />
          </span>
          <span>
            Progress & next steps
            <small>Where things stand, and what happens next.</small>
          </span>
        </legend>
        <div className="form-grid">
          <label className="field">
            <span>Status</span>
            <select {...register("status")}>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {field(
            "applied_on",
            currentStatus === "Saved"
              ? "Application date"
              : "Application date *",
            "date",
          )}
          <div className="span-2">
            {field(
              "next_action",
              "Next action",
              "text",
              "e.g. Follow up with the recruiter",
            )}
          </div>
          {field("next_action_at", "Next action date & time", "datetime-local")}
          <p className="field-help">
            Dates and times use your device’s timezone. Leave the date blank if
            your next step isn’t scheduled yet.
          </p>
        </div>
      </fieldset>
      <fieldset disabled={isSubmitting} className="form-section">
        <legend>
          <span className="section-icon">
            <FileText size={19} />
          </span>
          <span>
            Notes & context<small>Keep useful details close at hand.</small>
          </span>
        </legend>
        <label className="field">
          <span>Notes</span>
          <textarea
            rows={5}
            {...register("notes")}
            aria-invalid={!!errors.notes}
            aria-describedby={errors.notes ? "notes-error" : undefined}
            placeholder="Recruiter details, interview prep, or anything to remember…"
          />
          {errors.notes && (
            <small id="notes-error" className="error-text">
              {errors.notes.message}
            </small>
          )}
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <div className="form-actions">
        <span className="save-hint">Changes are saved when you submit.</span>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Check size={16} />
          )}
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
