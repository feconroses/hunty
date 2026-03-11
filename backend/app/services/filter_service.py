import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.company import Company
from app.models.filter_rule import FilterRule
from app.schemas.filter_rule import CreateFilterRequest, UpdateFilterRequest
from app.services.activity_service import ActivityService

logger = logging.getLogger(__name__)


class FilterService:
    """Service for managing filter rules."""

    @staticmethod
    async def list_filters(
        db: AsyncSession, user_id: int
    ) -> list[FilterRule]:
        """List all filter rules for a user."""
        result = await db.execute(
            select(FilterRule)
            .where(FilterRule.user_id == user_id)
            .order_by(FilterRule.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_filter(
        db: AsyncSession, user_id: int, data: CreateFilterRequest
    ) -> FilterRule:
        """Create a new filter rule."""
        # Validate company ownership if company_id provided
        if data.company_id is not None:
            company_result = await db.execute(
                select(Company).where(
                    Company.id == data.company_id, Company.user_id == user_id
                )
            )
            if company_result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Company not found.",
                )

        filter_rule = FilterRule(
            user_id=user_id,
            company_id=data.company_id,
            rule_type=data.rule_type,
            value=data.value.strip(),
        )
        db.add(filter_rule)
        await db.flush()
        await db.refresh(filter_rule)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="filter_created",
            entity_type="filter_rule",
            entity_id=filter_rule.id,
            details={"rule_type": filter_rule.rule_type, "value": filter_rule.value},
        )

        return filter_rule

    @staticmethod
    async def update_filter(
        db: AsyncSession, user_id: int, filter_id: int, data: UpdateFilterRequest
    ) -> FilterRule:
        """Update an existing filter rule."""
        result = await db.execute(
            select(FilterRule).where(
                FilterRule.id == filter_id, FilterRule.user_id == user_id
            )
        )
        filter_rule = result.scalar_one_or_none()
        if filter_rule is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Filter rule not found.",
            )

        if data.rule_type is not None:
            filter_rule.rule_type = data.rule_type
        if data.value is not None:
            filter_rule.value = data.value.strip()

        db.add(filter_rule)
        await db.flush()
        await db.refresh(filter_rule)

        await ActivityService.log(
            db,
            user_id=user_id,
            action="filter_updated",
            entity_type="filter_rule",
            entity_id=filter_rule.id,
        )

        return filter_rule

    @staticmethod
    async def delete_filter(
        db: AsyncSession, user_id: int, filter_id: int
    ) -> None:
        """Delete a filter rule."""
        result = await db.execute(
            select(FilterRule).where(
                FilterRule.id == filter_id, FilterRule.user_id == user_id
            )
        )
        filter_rule = result.scalar_one_or_none()
        if filter_rule is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Filter rule not found.",
            )

        await db.delete(filter_rule)
        await db.flush()

        await ActivityService.log(
            db,
            user_id=user_id,
            action="filter_deleted",
            entity_type="filter_rule",
            entity_id=filter_id,
        )

    @staticmethod
    async def generate_prompt(
        db: AsyncSession, user_id: int, company_id: int
    ) -> str:
        """
        Generate a Claude prompt from filter rules.

        Combines general rules (company_id IS NULL) with company-specific rules
        into formatted text.
        """
        # Validate company ownership
        company_result = await db.execute(
            select(Company).where(
                Company.id == company_id, Company.user_id == user_id
            )
        )
        company = company_result.scalar_one_or_none()
        if company is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found.",
            )

        # Get general rules (no company)
        general_result = await db.execute(
            select(FilterRule).where(
                FilterRule.user_id == user_id,
                FilterRule.company_id.is_(None),
            )
        )
        general_rules = list(general_result.scalars().all())

        # Get company-specific rules
        company_result = await db.execute(
            select(FilterRule).where(
                FilterRule.user_id == user_id,
                FilterRule.company_id == company_id,
            )
        )
        company_rules = list(company_result.scalars().all())

        # Build the prompt
        sections = []
        sections.append(
            f"You are analyzing job listings from {company.name} ({company.url})."
        )
        sections.append(
            "Filter and evaluate each job based on the following criteria:"
        )

        if general_rules:
            sections.append("\n## General Criteria")
            for rule in general_rules:
                sections.append(_format_rule(rule))

        if company_rules:
            sections.append(f"\n## Company-Specific Criteria for {company.name}")
            for rule in company_rules:
                sections.append(_format_rule(rule))

        sections.append(
            "\nFor each job, return a JSON object with: title, url, location, "
            "work_type, salary_min, salary_max, salary_currency, seniority_level, "
            "department, skills (array), description_summary, full_description, "
            "and a 'match_score' (0-100) indicating how well the job matches the criteria."
        )

        return "\n".join(sections)


def _format_rule(rule: FilterRule) -> str:
    """Format a single filter rule as a readable line for the prompt.

    The frontend stores values in "category:actual_value" format
    (e.g. "title:engineer", "seniority:senior") and rule_type is
    "include" or "exclude".
    """
    value = rule.value
    category = ""

    # Parse "category:value" encoding
    idx = value.find(":")
    if idx != -1:
        category = value[:idx]
        value = value[idx + 1:]

    is_exclude = rule.rule_type == "exclude"

    category_labels = {
        "title": ("Job title must NOT include" if is_exclude else "Job title MUST include"),
        "description": ("Job description must NOT mention" if is_exclude else "Job description MUST mention"),
        "location": "Preferred location",
        "seniority": "Preferred seniority level",
        "work_type": "Preferred work type",
        "min_salary": "Minimum salary",
        "free_text": "Additional requirement",
    }

    label = category_labels.get(category, f"{'Exclude' if is_exclude else 'Include'} criteria")
    return f"- {label}: {value}"
