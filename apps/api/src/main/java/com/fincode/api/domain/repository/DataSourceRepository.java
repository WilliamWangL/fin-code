package com.fincode.api.domain.repository;

import com.fincode.api.domain.model.DataSource;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DataSourceRepository extends JpaRepository<DataSource, Long> {

    List<DataSource> findByName(String name);
}
